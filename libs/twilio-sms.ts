"use server";

import twilio from "twilio";

interface SMSMessage {
  to: string;
  body: string;
  mediaUrl?: string[];
}

interface SMSMessageResponse {
  sid: string;
  status: string;
  errorCode?: string;
  errorMessage?: string;
}

interface SMSDeliveryStatus {
  messageSid: string;
  status: "queued" | "sent" | "delivered" | "undelivered" | "failed";
  errorCode?: string;
  errorMessage?: string;
  timestamp: Date;
}

class TwilioSMSService {
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
   * Send SMS message via Twilio
   */
  async sendMessage({
    to,
    body,
    mediaUrl,
  }: SMSMessage): Promise<SMSMessageResponse> {
    try {
      // Ensure phone number is in E.164 format
      const formattedTo = this.formatPhoneNumber(to);

      console.log(
        `Sending SMS message to ${formattedTo} from ${this.fromNumber}`,
      );

      const messageOptions: any = {
        from: this.fromNumber,
        to: formattedTo,
        body,
      };

      if (mediaUrl && mediaUrl.length > 0) {
        messageOptions.mediaUrl = mediaUrl;
      }

      const message = await this.client.messages.create(messageOptions);

      console.log(`SMS message sent successfully: ${message.sid}`);

      return {
        sid: message.sid,
        status: message.status,
      };
    } catch (error: any) {
      console.error("Failed to send SMS message:", error);

      return {
        sid: "",
        status: "failed",
        errorCode: error.code?.toString(),
        errorMessage: error.message,
      };
    }
  }

  /**
   * Send bulk SMS messages
   */
  async sendBulkMessages(
    messages: SMSMessage[],
  ): Promise<SMSMessageResponse[]> {
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
   * Get SMS delivery status
   */
  async getMessageStatus(messageSid: string): Promise<SMSDeliveryStatus> {
    try {
      const message = await this.client.messages(messageSid).fetch();

      return {
        messageSid,
        status: message.status as SMSDeliveryStatus["status"],
        errorCode: message.errorCode?.toString(),
        errorMessage: message.errorMessage || undefined,
        timestamp: new Date(message.dateUpdated),
      };
    } catch (error: any) {
      console.error(`Failed to get SMS status for ${messageSid}:`, error);

      return {
        messageSid,
        status: "failed",
        errorMessage: error.message,
        timestamp: new Date(),
      };
    }
  }

  /**
   * Process incoming SMS webhook
   */
  processIncomingSMS(webhookData: any) {
    return {
      messageSid: webhookData.MessageSid,
      from: webhookData.From,
      to: webhookData.To,
      body: webhookData.Body || "",
      mediaCount: parseInt(webhookData.NumMedia || "0"),
      mediaUrls: this.extractMediaUrls(webhookData),
      timestamp: new Date(),
    };
  }

  /**
   * Validate SMS webhook signature
   */
  validateWebhook(signature: string, url: string, params: any): boolean {
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    if (!authToken) return false;

    return twilio.validateRequest(authToken, signature, url, params);
  }

  /**
   * Format phone number for SMS (E.164 format)
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
   * Check if SMS is properly configured
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

  /**
   * Estimate SMS segments (for cost calculation)
   */
  estimateSMSSegments(message: string): number {
    // Basic GSM 7-bit characters: 160 chars per segment
    // Unicode characters: 70 chars per segment
    const hasUnicode = /[^\x00-\x7F]/.test(message);
    const maxLength = hasUnicode ? 70 : 160;

    return Math.ceil(message.length / maxLength);
  }

  /**
   * Check if phone number can receive SMS
   */
  async validatePhoneNumber(phoneNumber: string): Promise<{
    valid: boolean;
    carrier?: string;
    type?: string;
    error?: string;
  }> {
    try {
      const formattedNumber = this.formatPhoneNumber(phoneNumber);

      // Use Twilio Lookup API to validate phone number
      const phoneNumberInfo = await this.client.lookups.v1
        .phoneNumbers(formattedNumber)
        .fetch({ type: ["carrier"] });

      return {
        valid: true,
        carrier: phoneNumberInfo.carrier?.name as unknown as string,
        type: phoneNumberInfo.carrier?.type as unknown as string,
      };
    } catch (error: any) {
      console.error("Phone number validation failed:", error);
      return {
        valid: false,
        error: error.message,
      };
    }
  }
}

// Singleton instance
let twilioSMS: TwilioSMSService | null = null;

export const getTwilioSMSService = (): TwilioSMSService => {
  if (!twilioSMS) {
    twilioSMS = new TwilioSMSService();
  }
  return twilioSMS;
};

export type { SMSMessage, SMSMessageResponse, SMSDeliveryStatus };
