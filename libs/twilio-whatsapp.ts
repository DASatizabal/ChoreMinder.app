"use server";

import twilio from "twilio";

interface WhatsAppMessage {
  to: string;
  body: string;
  mediaUrl?: string;
}

interface WhatsAppMessageResponse {
  sid: string;
  status: string;
  errorCode?: string;
  errorMessage?: string;
}

interface DeliveryStatus {
  messageSid: string;
  status: "queued" | "sent" | "delivered" | "read" | "failed" | "undelivered";
  errorCode?: string;
  errorMessage?: string;
  timestamp: Date;
}

class TwilioWhatsAppService {
  private client: twilio.Twilio;
  private fromNumber: string;

  constructor() {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    this.fromNumber = process.env.TWILIO_PHONE_NUMBER || "";

    if (!accountSid || !authToken) {
      throw new Error("Twilio credentials not configured");
    }

    this.client = twilio(accountSid, authToken);
  }

  /**
   * Send WhatsApp message via Twilio
   */
  async sendMessage({
    to,
    body,
    mediaUrl,
  }: WhatsAppMessage): Promise<WhatsAppMessageResponse> {
    try {
      // Ensure phone number is in E.164 format for WhatsApp
      const formattedTo = this.formatPhoneNumber(to);
      const formattedFrom = `whatsapp:${this.fromNumber}`;
      const whatsappTo = `whatsapp:${formattedTo}`;

      console.log(
        `Sending WhatsApp message to ${whatsappTo} from ${formattedFrom}`,
      );

      const messageOptions: any = {
        from: formattedFrom,
        to: whatsappTo,
        body,
      };

      if (mediaUrl) {
        messageOptions.mediaUrl = [mediaUrl];
      }

      const message = await this.client.messages.create(messageOptions);

      console.log(`WhatsApp message sent successfully: ${message.sid}`);

      return {
        sid: message.sid,
        status: message.status,
      };
    } catch (error: any) {
      console.error("Failed to send WhatsApp message:", error);

      return {
        sid: "",
        status: "failed",
        errorCode: error.code?.toString(),
        errorMessage: error.message,
      };
    }
  }

  /**
   * Send bulk WhatsApp messages
   */
  async sendBulkMessages(
    messages: WhatsAppMessage[],
  ): Promise<WhatsAppMessageResponse[]> {
    const results = await Promise.allSettled(
      messages.map((message) => this.sendMessage(message)),
    );

    return results.map((result) => {
      if (result.status === "fulfilled") {
        return result.value;
      } else {
        return {
          sid: "",
          status: "failed",
          errorMessage: result.reason?.message || "Unknown error",
        };
      }
    });
  }

  /**
   * Get message delivery status
   */
  async getMessageStatus(messageSid: string): Promise<DeliveryStatus> {
    try {
      const message = await this.client.messages(messageSid).fetch();

      return {
        messageSid,
        status: message.status as DeliveryStatus["status"],
        errorCode: message.errorCode?.toString(),
        errorMessage: message.errorMessage || undefined,
        timestamp: new Date(message.dateUpdated),
      };
    } catch (error: any) {
      console.error(`Failed to get message status for ${messageSid}:`, error);

      return {
        messageSid,
        status: "failed",
        errorMessage: error.message,
        timestamp: new Date(),
      };
    }
  }

  /**
   * Process incoming WhatsApp webhook
   */
  processIncomingMessage(webhookData: any) {
    return {
      messageSid: webhookData.MessageSid,
      from: this.parsePhoneNumber(webhookData.From),
      to: this.parsePhoneNumber(webhookData.To),
      body: webhookData.Body || "",
      mediaCount: parseInt(webhookData.NumMedia || "0"),
      mediaUrls: this.extractMediaUrls(webhookData),
      timestamp: new Date(),
    };
  }

  /**
   * Process delivery status webhook
   */
  processDeliveryStatus(webhookData: any): DeliveryStatus {
    return {
      messageSid: webhookData.MessageSid,
      status: webhookData.MessageStatus,
      errorCode: webhookData.ErrorCode,
      errorMessage: webhookData.ErrorMessage,
      timestamp: new Date(),
    };
  }

  /**
   * Validate WhatsApp webhook signature
   */
  validateWebhook(signature: string, url: string, params: any): boolean {
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    if (!authToken) return false;

    return twilio.validateRequest(authToken, signature, url, params);
  }

  /**
   * Format phone number for WhatsApp (E.164 format)
   */
  private formatPhoneNumber(phoneNumber: string): string {
    // Remove all non-digit characters
    let cleaned = phoneNumber.replace(/\D/g, "");

    // Add country code if missing (assuming US +1 for now)
    if (!cleaned.startsWith("1") && cleaned.length === 10) {
      cleaned = `1${cleaned}`;
    }

    return `+${cleaned}`;
  }

  /**
   * Parse phone number from WhatsApp format
   */
  private parsePhoneNumber(whatsappNumber: string): string {
    return whatsappNumber.replace("whatsapp:", "");
  }

  /**
   * Extract media URLs from webhook data
   */
  private extractMediaUrls(webhookData: any): string[] {
    const mediaCount = parseInt(webhookData.NumMedia || "0");
    const mediaUrls: string[] = [];

    for (let i = 0; i < mediaCount; i++) {
      const mediaUrl = webhookData[`MediaUrl${i}`];
      if (mediaUrl) {
        mediaUrls.push(mediaUrl);
      }
    }

    return mediaUrls;
  }

  /**
   * Check if WhatsApp is properly configured
   */
  isConfigured(): boolean {
    return !!(
      process.env.TWILIO_ACCOUNT_SID &&
      process.env.TWILIO_AUTH_TOKEN &&
      process.env.TWILIO_PHONE_NUMBER
    );
  }

  /**
   * Get service status and configuration info
   */
  getServiceInfo() {
    return {
      configured: this.isConfigured(),
      fromNumber: this.fromNumber,
      accountSid: process.env.TWILIO_ACCOUNT_SID?.slice(-4) || "Not set",
    };
  }
}

// Singleton instance
let twilioWhatsApp: TwilioWhatsAppService | null = null;

export const getTwilioWhatsAppService = (): TwilioWhatsAppService => {
  if (!twilioWhatsApp) {
    twilioWhatsApp = new TwilioWhatsAppService();
  }
  return twilioWhatsApp;
};

export type { WhatsAppMessage, WhatsAppMessageResponse, DeliveryStatus };
