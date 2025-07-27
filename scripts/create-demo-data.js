#!/usr/bin/env node

/**
 * ChoreMinder Demo Data Creation Script
 * 
 * Creates compelling, realistic demo family data for POC demonstrations
 * Includes the Johnson family with 30 days of authentic usage patterns
 */

import connectMongo from '../libs/mongoose.ts';
import User from '../models/User.ts';
import Family from '../models/Family.ts';
import Chore from '../models/Chore.ts';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';

const DEMO_PASSWORD = 'Demo2024!';

// Demo family data structure
const DEMO_FAMILIES = {
  johnson: {
    family: {
      name: "The Johnson Family",
      description: "Active family focused on teaching responsibility through age-appropriate chores",
      settings: {
        pointsPerDollar: 10,
        allowanceDay: 'Sunday',
        maxDailyChores: 5,
        quietHours: { start: '20:00', end: '07:00' },
        photoRequired: true,
        timezone: 'America/New_York'
      }
    },
    members: [
      {
        name: "Sarah Johnson",
        email: "sarah@demo.com",
        role: "parent",
        profile: {
          avatar: "/avatars/mom.png",
          phone: "+1-555-0101",
          preferences: {
            notifications: {
              whatsapp: true,
              sms: false,
              email: true,
              pushNotifications: true
            },
            communication: {
              primaryChannel: "whatsapp",
              reminderFrequency: "daily",
              digestType: "weekly"
            }
          }
        },
        gamification: {
          totalPoints: 1250,
          currentStreak: 12,
          longestStreak: 18,
          level: 8,
          achievements: [
            "family_creator", "consistent_parent", "fair_assignor", 
            "quality_reviewer", "supportive_coach"
          ]
        }
      },
      {
        name: "Mike Johnson", 
        email: "mike@demo.com",
        role: "parent",
        profile: {
          avatar: "/avatars/dad.png",
          phone: "+1-555-0102",
          preferences: {
            notifications: {
              whatsapp: false,
              sms: true,
              email: false,
              pushNotifications: true
            },
            communication: {
              primaryChannel: "sms",
              reminderFrequency: "as_needed",
              digestType: "monthly"
            }
          }
        },
        gamification: {
          totalPoints: 890,
          currentStreak: 7,
          longestStreak: 15,
          level: 6,
          achievements: [
            "weekend_warrior", "outdoor_expert", "family_supporter",
            "team_player"
          ]
        }
      },
      {
        name: "Emma Johnson",
        email: "emma@demo.com", 
        role: "child",
        profile: {
          avatar: "/avatars/girl-teen.png",
          age: 12,
          grade: 7,
          preferences: {
            notifications: {
              whatsapp: false,
              sms: false,
              email: false,
              pushNotifications: true
            },
            communication: {
              primaryChannel: "app",
              reminderFrequency: "immediate",
              digestType: "daily"
            }
          }
        },
        gamification: {
          totalPoints: 2340,
          currentStreak: 5,
          longestStreak: 12,
          level: 12,
          achievements: [
            "streak_master", "perfectionist", "early_bird", "organizer_pro",
            "team_leader", "quality_control", "responsibility_champion"
          ]
        }
      },
      {
        name: "Alex Johnson",
        email: "alex@demo.com",
        role: "child", 
        profile: {
          avatar: "/avatars/boy-kid.png",
          age: 9,
          grade: 4,
          preferences: {
            notifications: {
              whatsapp: false,
              sms: false,
              email: false,
              pushNotifications: true
            },
            communication: {
              primaryChannel: "app",
              reminderFrequency: "gentle",
              digestType: "daily"
            }
          }
        },
        gamification: {
          totalPoints: 1580,
          currentStreak: 3,
          longestStreak: 8,
          level: 9,
          achievements: [
            "improver", "helper", "outdoor_enthusiast", "creative_solver",
            "consistent_contributor"
          ]
        }
      }
    ]
  }
};

// Comprehensive chore templates for realistic demo data
const CHORE_TEMPLATES = {
  daily: [
    {
      title: "Make bed",
      description: "Make your bed with pillows arranged neatly",
      category: "bedroom",
      basePoints: 10,
      estimatedDuration: 5,
      difficulty: "easy",
      ageAppropriate: [6, 18]
    },
    {
      title: "Load/unload dishwasher", 
      description: "Put dirty dishes in dishwasher or put clean dishes away",
      category: "kitchen",
      basePoints: 15,
      estimatedDuration: 10,
      difficulty: "medium",
      ageAppropriate: [8, 18]
    },
    {
      title: "Feed pets",
      description: "Give pets fresh food and water, check they're comfortable",
      category: "pets",
      basePoints: 12,
      estimatedDuration: 8,
      difficulty: "easy",
      ageAppropriate: [6, 18]
    },
    {
      title: "Tidy living room",
      description: "Put items back in place, fluff cushions, organize coffee table",
      category: "living_areas", 
      basePoints: 18,
      estimatedDuration: 15,
      difficulty: "medium",
      ageAppropriate: [8, 18]
    }
  ],
  weekly: [
    {
      title: "Clean bathroom",
      description: "Wipe surfaces, clean mirror, sweep floor, empty trash",
      category: "bathroom",
      basePoints: 35,
      estimatedDuration: 25,
      difficulty: "medium",
      ageAppropriate: [10, 18]
    },
    {
      title: "Vacuum living areas",
      description: "Vacuum all carpeted areas in living room and hallways",
      category: "living_areas",
      basePoints: 30,
      estimatedDuration: 20,
      difficulty: "medium", 
      ageAppropriate: [9, 18]
    },
    {
      title: "Organize bedroom",
      description: "Put clothes away, organize desk, tidy shelves and surfaces",
      category: "bedroom",
      basePoints: 25,
      estimatedDuration: 30,
      difficulty: "medium",
      ageAppropriate: [8, 18]
    },
    {
      title: "Take out trash and recycling",
      description: "Empty all trash cans, take bins to curb, bring empty bins back",
      category: "outdoor",
      basePoints: 20,
      estimatedDuration: 15,
      difficulty: "easy",
      ageAppropriate: [8, 18]
    }
  ],
  special: [
    {
      title: "Spring cleaning - garage organization",
      description: "Sort through garage items, organize tools, sweep floor",
      category: "outdoor",
      basePoints: 45,
      estimatedDuration: 60,
      difficulty: "hard",
      ageAppropriate: [12, 18]
    },
    {
      title: "Deep clean kitchen",
      description: "Clean appliances inside and out, organize cabinets, wipe baseboards",
      category: "kitchen", 
      basePoints: 50,
      estimatedDuration: 45,
      difficulty: "hard",
      ageAppropriate: [12, 18]
    },
    {
      title: "Wash and fold laundry",
      description: "Complete laundry cycle from washing to folding and putting away",
      category: "laundry",
      basePoints: 35,
      estimatedDuration: 40,
      difficulty: "medium",
      ageAppropriate: [10, 18]
    }
  ]
};

/**
 * Create realistic chore history with authentic patterns
 */
function generateChoreHistory(familyId, members, daysBack = 30) {
  const chores = [];
  const now = new Date();
  
  // Emma's patterns: High achiever, consistent, prefers organizing
  const emmaPreferences = ['bedroom', 'living_areas', 'pets'];
  const emmaTimes = ['07:00', '08:00', '16:00', '17:00']; // Early bird
  
  // Alex's patterns: Improving, prefers outdoor tasks, afternoon worker
  const alexPreferences = ['outdoor', 'pets', 'living_areas'];
  const alexTimes = ['15:00', '16:00', '17:00', '18:00']; // After school
  
  // Generate historical chores
  for (let day = daysBack; day >= 0; day--) {
    const choreDate = new Date(now.getTime() - (day * 24 * 60 * 60 * 1000));
    const isWeekend = choreDate.getDay() === 0 || choreDate.getDay() === 6;
    
    // More chores on weekends
    const choresPerDay = isWeekend ? 4 : 2;
    
    for (let i = 0; i < choresPerDay; i++) {
      // Choose chore type based on day
      const choreType = isWeekend ? 
        (Math.random() > 0.3 ? 'weekly' : 'special') : 'daily';
      
      const templates = CHORE_TEMPLATES[choreType];
      const template = templates[Math.floor(Math.random() * templates.length)];
      
      // Assign based on age appropriateness and preferences
      let assignedMember;
      if (template.ageAppropriate[0] <= 9) {
        // Both kids can do it, choose based on preferences
        if (emmaPreferences.includes(template.category) && Math.random() > 0.4) {
          assignedMember = members.find(m => m.name === "Emma Johnson");
        } else {
          assignedMember = members.find(m => m.name === "Alex Johnson");
        }
      } else {
        // Only Emma can do it
        assignedMember = members.find(m => m.name === "Emma Johnson");
      }
      
      // Determine completion patterns
      const assignedTimes = assignedMember.name === "Emma Johnson" ? emmaTimes : alexTimes;
      const assignedTime = assignedTimes[Math.floor(Math.random() * assignedTimes.length)];
      
      // Emma: 94% completion rate, Alex: 85% completion rate
      const completionRate = assignedMember.name === "Emma Johnson" ? 0.94 : 0.85;
      const isCompleted = Math.random() < completionRate;
      
      const dueDateTime = new Date(choreDate);
      dueDateTime.setHours(parseInt(assignedTime.split(':')[0]), parseInt(assignedTime.split(':')[1]));
      
      const chore = {
        _id: new mongoose.Types.ObjectId(),
        title: template.title,
        description: template.description,
        family: familyId,
        assignedTo: assignedMember._id,
        assignedBy: members.find(m => m.role === "parent")._id,
        category: template.category,
        status: isCompleted ? 'verified' : (Math.random() > 0.8 ? 'pending' : 'in_progress'),
        dueDate: dueDateTime,
        points: {
          base: template.basePoints,
          bonus: isCompleted ? Math.floor(Math.random() * 5) : 0,
          total: template.basePoints + (isCompleted ? Math.floor(Math.random() * 5) : 0)
        },
        estimatedDuration: template.estimatedDuration,
        difficulty: template.difficulty,
        photoRequired: template.category !== 'pets',
        recurring: choreType === 'daily' ? {
          enabled: true,
          pattern: 'daily',
          endDate: null
        } : null,
        history: []
      };
      
      // Add completion history for completed chores
      if (isCompleted) {
        const completionTime = new Date(dueDateTime.getTime() + (Math.random() * 2 * 60 * 60 * 1000)); // Within 2 hours
        chore.completedAt = completionTime;
        chore.approvedAt = new Date(completionTime.getTime() + (Math.random() * 60 * 60 * 1000)); // Approved within 1 hour
        chore.approvedBy = members.find(m => m.role === "parent")._id;
        
        chore.history.push({
          action: 'assigned',
          timestamp: new Date(dueDateTime.getTime() - (24 * 60 * 60 * 1000)), // Assigned day before
          user: members.find(m => m.role === "parent")._id,
          note: 'Chore assigned'
        });
        
        chore.history.push({
          action: 'completed',
          timestamp: completionTime,
          user: assignedMember._id,
          note: 'Task completed with photo verification'
        });
        
        chore.history.push({
          action: 'approved',
          timestamp: chore.approvedAt,
          user: members.find(m => m.role === "parent")._id,
          note: 'Great job! Quality work.'
        });
      }
      
      chores.push(chore);
    }
  }
  
  return chores;
}

/**
 * Generate current active challenges
 */
function generateActiveChallenges(familyId) {
  return [
    {
      _id: new mongoose.Types.ObjectId(),
      title: "Spring Cleaning Challenge",
      description: "Complete 50 chores as a family to earn a special weekend trip",
      family: familyId,
      type: "family",
      target: 50,
      current: 45,
      startDate: new Date(Date.now() - (14 * 24 * 60 * 60 * 1000)), // Started 2 weeks ago
      endDate: new Date(Date.now() + (14 * 24 * 60 * 60 * 1000)), // Ends in 2 weeks
      reward: {
        type: "experience",
        description: "Family weekend camping trip",
        value: 500
      },
      status: "active",
      participants: [], // Will be populated with family member IDs
      progress: [
        { date: new Date(Date.now() - (13 * 24 * 60 * 60 * 1000)), count: 8 },
        { date: new Date(Date.now() - (12 * 24 * 60 * 60 * 1000)), count: 12 },
        { date: new Date(Date.now() - (11 * 24 * 60 * 60 * 1000)), count: 15 },
        { date: new Date(Date.now() - (10 * 24 * 60 * 60 * 1000)), count: 18 },
        { date: new Date(Date.now() - (9 * 24 * 60 * 60 * 1000)), count: 22 },
        { date: new Date(Date.now() - (8 * 24 * 60 * 60 * 1000)), count: 25 },
        { date: new Date(Date.now() - (7 * 24 * 60 * 60 * 1000)), count: 28 },
        { date: new Date(Date.now() - (6 * 24 * 60 * 60 * 1000)), count: 32 },
        { date: new Date(Date.now() - (5 * 24 * 60 * 60 * 1000)), count: 35 },
        { date: new Date(Date.now() - (4 * 24 * 60 * 60 * 1000)), count: 38 },
        { date: new Date(Date.now() - (3 * 24 * 60 * 60 * 1000)), count: 41 },
        { date: new Date(Date.now() - (2 * 24 * 60 * 60 * 1000)), count: 43 },
        { date: new Date(Date.now() - (1 * 24 * 60 * 60 * 1000)), count: 45 }
      ]
    }
  ];
}

/**
 * Create upcoming chores for demo
 */
function generateUpcomingChores(familyId, members) {
  const chores = [];
  const now = new Date();
  
  // Today's remaining chores
  const todayChores = [
    {
      title: "Tidy living room",
      assignee: "Alex Johnson",
      dueTime: "16:00",
      points: 18
    },
    {
      title: "Feed pets (evening)",
      assignee: "Emma Johnson", 
      dueTime: "17:30",
      points: 12
    }
  ];
  
  // Tomorrow's chores
  const tomorrowChores = [
    {
      title: "Make bed",
      assignee: "Emma Johnson",
      dueTime: "08:00", 
      points: 10
    },
    {
      title: "Make bed",
      assignee: "Alex Johnson",
      dueTime: "08:30",
      points: 10
    },
    {
      title: "Load dishwasher",
      assignee: "Emma Johnson",
      dueTime: "19:00",
      points: 15
    }
  ];
  
  // Create today's chores
  todayChores.forEach(choreData => {
    const member = members.find(m => m.name === choreData.assignee);
    const dueDateTime = new Date(now);
    dueDateTime.setHours(parseInt(choreData.dueTime.split(':')[0]), parseInt(choreData.dueTime.split(':')[1]));
    
    chores.push({
      _id: new mongoose.Types.ObjectId(),
      title: choreData.title,
      description: `Daily ${choreData.title.toLowerCase()} task`,
      family: familyId,
      assignedTo: member._id,
      assignedBy: members.find(m => m.role === "parent")._id,
      category: choreData.title.includes('room') ? 'living_areas' : 
                choreData.title.includes('pets') ? 'pets' : 'general',
      status: 'pending',
      dueDate: dueDateTime,
      points: {
        base: choreData.points,
        bonus: 0,
        total: choreData.points
      },
      estimatedDuration: 10,
      difficulty: "easy",
      photoRequired: true,
      recurring: {
        enabled: true,
        pattern: 'daily',
        endDate: null
      },
      history: [{
        action: 'assigned',
        timestamp: new Date(now.getTime() - (2 * 60 * 60 * 1000)), // Assigned 2 hours ago
        user: members.find(m => m.role === "parent")._id,
        note: 'Daily chore assigned'
      }]
    });
  });
  
  // Create tomorrow's chores
  tomorrowChores.forEach(choreData => {
    const member = members.find(m => m.name === choreData.assignee);
    const dueDateTime = new Date(now.getTime() + (24 * 60 * 60 * 1000)); // Tomorrow
    dueDateTime.setHours(parseInt(choreData.dueTime.split(':')[0]), parseInt(choreData.dueTime.split(':')[1]));
    
    chores.push({
      _id: new mongoose.Types.ObjectId(),
      title: choreData.title,
      description: `Daily ${choreData.title.toLowerCase()} task`,
      family: familyId,
      assignedTo: member._id,
      assignedBy: members.find(m => m.role === "parent")._id,
      category: choreData.title.includes('bed') ? 'bedroom' : 
                choreData.title.includes('dishwasher') ? 'kitchen' : 'general',
      status: 'scheduled',
      dueDate: dueDateTime,
      points: {
        base: choreData.points,
        bonus: 0,
        total: choreData.points
      },
      estimatedDuration: choreData.title.includes('bed') ? 5 : 10,
      difficulty: "easy",
      photoRequired: true,
      recurring: {
        enabled: true,
        pattern: 'daily',
        endDate: null
      },
      history: [{
        action: 'scheduled',
        timestamp: now,
        user: members.find(m => m.role === "parent")._id,
        note: 'Automatically scheduled recurring chore'
      }]
    });
  });
  
  return chores;
}

/**
 * Main function to create all demo data
 */
async function createDemoData() {
  try {
    console.log('🚀 Starting ChoreMinder demo data creation...');
    
    // Connect to database
    await connectMongo();
    console.log('✅ Connected to database');
    
    // Clean existing demo data
    console.log('🧹 Cleaning existing demo data...');
    await User.deleteMany({ email: { $regex: /@demo\.com$/ } });
    await Family.deleteMany({ name: { $regex: /demo|johnson/i } });
    await Chore.deleteMany({}); // Clean all chores for fresh demo
    
    // Create Johnson family
    console.log('👨‍👩‍👧‍👦 Creating Johnson family...');
    const johnsonData = DEMO_FAMILIES.johnson;
    
    // Create family document
    const family = new Family({
      name: johnsonData.family.name,
      description: johnsonData.family.description,
      settings: johnsonData.family.settings,
      members: [],
      challenges: generateActiveChallenges(null), // Will update with family ID
      createdAt: new Date(Date.now() - (45 * 24 * 60 * 60 * 1000)), // Created 45 days ago
    });
    
    const savedFamily = await family.save();
    console.log(`✅ Created family: ${savedFamily.name}`);
    
    // Update challenges with family ID
    savedFamily.challenges = generateActiveChallenges(savedFamily._id);
    
    // Create family members
    const members = [];
    for (const memberData of johnsonData.members) {
      const hashedPassword = await bcrypt.hash(DEMO_PASSWORD, 12);
      
      const user = new User({
        name: memberData.name,
        email: memberData.email,
        password: hashedPassword,
        role: memberData.role,
        familyId: savedFamily._id,
        hasAccess: true,
        emailVerified: new Date(),
        profile: memberData.profile,
        gamification: memberData.gamification,
        createdAt: new Date(Date.now() - (40 * 24 * 60 * 60 * 1000)), // Created 40 days ago
      });
      
      const savedUser = await user.save();
      members.push(savedUser);
      
      // Add to family members
      savedFamily.members.push({
        user: savedUser._id,
        role: memberData.role,
        joinedAt: new Date(Date.now() - (40 * 24 * 60 * 60 * 1000)),
        permissions: memberData.role === 'parent' ? 
          ['manage_family', 'create_chores', 'approve_chores', 'view_analytics'] :
          ['complete_chores', 'view_progress']
      });
      
      console.log(`✅ Created user: ${memberData.name} (${memberData.role})`);
    }
    
    // Update family challenges with participant IDs
    savedFamily.challenges[0].participants = members.map(m => m._id);
    await savedFamily.save();
    
    // Generate historical chores (30 days)
    console.log('📋 Generating historical chores...');
    const historicalChores = generateChoreHistory(savedFamily._id, members, 30);
    
    // Generate upcoming chores
    console.log('📅 Creating upcoming chores...');
    const upcomingChores = generateUpcomingChores(savedFamily._id, members);
    
    // Save all chores
    const allChores = [...historicalChores, ...upcomingChores];
    await Chore.insertMany(allChores);
    console.log(`✅ Created ${allChores.length} chores (${historicalChores.length} historical, ${upcomingChores.length} upcoming)`);
    
    // Update family statistics
    const completedChores = allChores.filter(c => c.status === 'verified');
    savedFamily.statistics = {
      totalChores: allChores.length,
      completedChores: completedChores.length,
      completionRate: Math.round((completedChores.length / allChores.length) * 100),
      totalPoints: completedChores.reduce((sum, chore) => sum + chore.points.total, 0),
      activeStreak: 12,
      lastActive: new Date()
    };
    
    await savedFamily.save();
    
    console.log('🎯 Demo data creation completed successfully!');
    console.log('\n📊 Summary:');
    console.log(`Family: ${savedFamily.name}`);
    console.log(`Members: ${members.length}`);
    console.log(`Total Chores: ${allChores.length}`);
    console.log(`Completed: ${completedChores.length} (${savedFamily.statistics.completionRate}%)`);
    console.log(`Active Challenge: ${savedFamily.challenges[0].title} (${savedFamily.challenges[0].current}/${savedFamily.challenges[0].target})`);
    
    console.log('\n🔐 Demo Login Credentials:');
    console.log('Parent (Sarah): sarah@demo.com / Demo2024!');
    console.log('Parent (Mike): mike@demo.com / Demo2024!'); 
    console.log('Child (Emma): emma@demo.com / Demo2024!');
    console.log('Child (Alex): alex@demo.com / Demo2024!');
    
    console.log('\n🎬 Demo is ready for presentation!');
    
  } catch (error) {
    console.error('❌ Error creating demo data:', error);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Database connection closed');
  }
}

// Run the script
if (import.meta.url === `file://${process.argv[1]}`) {
  createDemoData();
}

export { createDemoData, DEMO_FAMILIES, CHORE_TEMPLATES };