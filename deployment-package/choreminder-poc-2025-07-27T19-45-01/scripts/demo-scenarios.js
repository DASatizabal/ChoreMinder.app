#!/usr/bin/env node

/**
 * ChoreMinder Demo Scenarios Script
 * 
 * Creates multiple family scenarios for different demo audiences
 * Each scenario highlights different aspects of ChoreMinder
 */

import connectMongo from '../libs/mongoose.ts';
import User from '../models/User.ts';
import Family from '../models/Family.ts';
import Chore from '../models/Chore.ts';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';

const DEMO_PASSWORD = 'Demo2024!';

// Multiple demo family scenarios
const DEMO_SCENARIOS = {
  // Primary demo family - The Johnsons (comprehensive features)
  johnson: {
    name: "The Johnson Family",
    description: "Tech-savvy family showcasing all ChoreMinder features",
    focus: "Complete feature demonstration",
    audience: "General stakeholders, comprehensive demos",
    members: [
      {
        name: "Sarah Johnson",
        email: "sarah@demo.com",
        role: "parent",
        personality: "Organized, tech-savvy, data-driven",
        highlights: ["Analytics usage", "Smart scheduling", "Quality control"]
      },
      {
        name: "Emma Johnson", 
        email: "emma@demo.com",
        role: "child",
        age: 12,
        personality: "High achiever, competitive, responsible",
        highlights: ["Achievement collection", "Streak maintenance", "Leadership"]
      },
      {
        name: "Alex Johnson",
        email: "alex@demo.com", 
        role: "child",
        age: 9,
        personality: "Creative, improving, needs encouragement",
        highlights: ["Growth progression", "Gamification engagement", "Support systems"]
      }
    ],
    keyMetrics: {
      completionRate: 87,
      totalChores: 138,
      activeStreak: 12,
      challengeProgress: "45/50 Spring Cleaning"
    }
  },

  // Busy professional family - The Garcias (efficiency focus)
  garcia: {
    name: "The Garcia Family", 
    description: "Dual-career parents leveraging automation for efficiency",
    focus: "Time-saving automation and communication",
    audience: "Busy professionals, working parents",
    members: [
      {
        name: "Maria Garcia",
        email: "maria@busydemo.com",
        role: "parent", 
        personality: "Busy professional, efficiency-focused, mobile-first",
        highlights: ["WhatsApp integration", "Quick approvals", "Smart escalation"]
      },
      {
        name: "Carlos Garcia",
        email: "carlos@busydemo.com",
        role: "parent",
        personality: "Travel frequently, relies on automation",
        highlights: ["Remote monitoring", "Automated scheduling", "Progress tracking"]
      },
      {
        name: "Sofia Garcia",
        email: "sofia@busydemo.com",
        role: "child", 
        age: 14,
        personality: "Independent, responsible, schedule-conscious",
        highlights: ["Self-management", "Calendar integration", "Notification preferences"]
      }
    ],
    keyMetrics: {
      completionRate: 92,
      automationLevel: "High",
      communicationEfficiency: "3x faster",
      parentTimeReduction: "12 min/day"
    }
  },

  // Large blended family - The Williams (complex coordination)
  williams: {
    name: "The Williams Blended Family",
    description: "Complex family structure with multiple households",
    focus: "Family coordination and permission management", 
    audience: "Complex family structures, educators",
    members: [
      {
        name: "Jennifer Williams",
        email: "jen@complexdemo.com",
        role: "parent",
        personality: "Primary coordinator, values fairness, detail-oriented",
        highlights: ["Fair task distribution", "Multi-household sync", "Conflict resolution"]
      },
      {
        name: "David Williams", 
        email: "david@complexdemo.com",
        role: "parent",
        personality: "Secondary parent, supportive, technology adopter",
        highlights: ["Shared oversight", "Communication bridging", "Schedule coordination"]
      },
      {
        name: "Maya Williams",
        email: "maya@complexdemo.com",
        role: "child",
        age: 16,
        personality: "Responsible oldest, mentors siblings, busy with activities", 
        highlights: ["Sibling leadership", "Schedule balancing", "Responsibility modeling"]
      },
      {
        name: "Jordan Williams",
        email: "jordan@complexdemo.com", 
        role: "child",
        age: 13,
        personality: "Middle child, competitive, seeks recognition",
        highlights: ["Healthy competition", "Skill development", "Recognition systems"]
      },
      {
        name: "Casey Williams",
        email: "casey@complexdemo.com",
        role: "child", 
        age: 8,
        personality: "Youngest, eager to help, needs guidance",
        highlights: ["Age-appropriate tasks", "Learning progression", "Encouragement systems"]
      }
    ],
    keyMetrics: {
      familySize: 5,
      coordinationComplexity: "High", 
      fairnessScore: "96%",
      conflictReduction: "78%"
    }
  },

  // Educational focus family - The Chens (character development)
  chen: {
    name: "The Chen Family",
    description: "Education-focused family emphasizing character development",
    focus: "Character building and educational integration",
    audience: "Educators, character development advocates",
    members: [
      {
        name: "Dr. Lisa Chen",
        email: "lisa@educationdemo.com", 
        role: "parent",
        personality: "Education professional, development-focused, measurement-oriented",
        highlights: ["Character tracking", "Skill progression", "Educational integration"]
      },
      {
        name: "Kevin Chen",
        email: "kevin@educationdemo.com",
        role: "child",
        age: 11,
        personality: "Studious, methodical, goal-oriented",
        highlights: ["Academic integration", "Goal setting", "Progress measurement"]
      },
      {
        name: "Amy Chen", 
        email: "amy@educationdemo.com",
        role: "child",
        age: 8,
        personality: "Creative, enthusiastic, learns through play",
        highlights: ["Creative tasks", "Play-based learning", "Artistic expression"]
      }
    ],
    keyMetrics: {
      skillDevelopment: "15 tracked skills",
      characterGrowth: "Measurable improvement",
      educationalIntegration: "100% alignment",
      parentInsight: "Deep analytics"
    }
  }
};

/**
 * Create scenario-specific chores based on family focus
 */
function generateScenarioChores(scenario, familyId, members) {
  const chores = [];
  const now = new Date();
  
  switch (scenario.focus.split(' ')[0].toLowerCase()) {
    case 'complete':
      // Comprehensive feature showcase
      return generateComprehensiveChores(familyId, members);
      
    case 'time-saving':
      // Efficiency and automation focus
      return generateEfficiencyChores(familyId, members);
      
    case 'family':
      // Complex coordination
      return generateCoordinationChores(familyId, members);
      
    case 'character':
      // Educational and character development
      return generateEducationalChores(familyId, members);
      
    default:
      return generateStandardChores(familyId, members);
  }
}

/**
 * Generate comprehensive chores for Johnson family
 */
function generateComprehensiveChores(familyId, members) {
  const baseChores = [
    // Today's pending chores
    {
      title: "Organize garage for spring cleaning",
      description: "Sort tools, sweep floor, organize sports equipment",
      category: "outdoor",
      assignee: "Emma Johnson",
      status: "pending",
      dueTime: "10:00",
      points: 45,
      photoRequired: true,
      teamwork: true
    },
    {
      title: "Deep clean kitchen appliances", 
      description: "Clean inside of microwave, wipe down coffee maker, organize spice rack",
      category: "kitchen",
      assignee: "Alex Johnson",
      status: "in_progress", 
      dueTime: "14:00",
      points: 35,
      photoRequired: true,
      quality: "high"
    },
    // Completed today
    {
      title: "Make beds and tidy bedrooms",
      description: "Make bed with hospital corners, organize desk, put clothes away",
      category: "bedroom", 
      assignee: "Emma Johnson",
      status: "verified",
      completedTime: "08:30",
      points: 25,
      bonusPoints: 5,
      photoRequired: true
    }
  ];
  
  return baseChores.map(chore => createChoreObject(chore, familyId, members));
}

/**
 * Generate efficiency-focused chores for Garcia family
 */
function generateEfficiencyChores(familyId, members) {
  const baseChores = [
    {
      title: "Quick morning routine check",
      description: "Bed made, room tidy, backpack ready - photo verification", 
      category: "bedroom",
      assignee: "Sofia Garcia",
      status: "verified",
      completedTime: "07:45",
      points: 20,
      automation: "auto-scheduled",
      efficiency: "3min completion"
    },
    {
      title: "After-school kitchen reset",
      description: "Load dishwasher, wipe counters, prep for dinner",
      category: "kitchen", 
      assignee: "Sofia Garcia",
      status: "pending",
      dueTime: "16:30",
      points: 25,
      reminder: "WhatsApp sent"
    }
  ];
  
  return baseChores.map(chore => createChoreObject(chore, familyId, members));
}

/**
 * Generate coordination-focused chores for Williams family
 */
function generateCoordinationChores(familyId, members) {
  const baseChores = [
    {
      title: "Weekly bathroom deep clean",
      description: "Scrub shower, clean mirror, mop floor, restock supplies",
      category: "bathroom",
      assignee: "Maya Williams", 
      status: "verified",
      points: 40,
      coordination: "Scheduled around soccer practice",
      fairness: "Rotated from Jordan last week"
    },
    {
      title: "Family laundry sorting",
      description: "Sort colors, start first load, fold previous load",
      category: "laundry",
      assignee: "Jordan Williams",
      status: "in_progress", 
      points: 30,
      collaboration: "Casey helping with sorting"
    },
    {
      title: "Outdoor toy organization",
      description: "Put bikes away, organize sports equipment, sweep patio",
      category: "outdoor",
      assignee: "Casey Williams",
      status: "pending",
      points: 20,
      supervision: "Maya providing guidance"
    }
  ];
  
  return baseChores.map(chore => createChoreObject(chore, familyId, members));
}

/**
 * Generate educational chores for Chen family
 */
function generateEducationalChores(familyId, members) {
  const baseChores = [
    {
      title: "Science experiment cleanup",
      description: "Properly dispose of materials, clean workspace, organize supplies by category",
      category: "educational",
      assignee: "Kevin Chen",
      status: "verified",
      points: 30,
      skills: ["Organization", "Responsibility", "Scientific Method"],
      learning: "Chemistry safety protocols"
    },
    {
      title: "Art supply organization", 
      description: "Sort crayons by color, organize paper by size, clean paintbrushes",
      category: "creative",
      assignee: "Amy Chen",
      status: "in_progress",
      points: 25,
      skills: ["Creativity", "Organization", "Care for Materials"],
      learning: "Color theory and material care"
    }
  ];
  
  return baseChores.map(chore => createChoreObject(chore, familyId, members));
}

/**
 * Helper function to create chore objects
 */
function createChoreObject(choreData, familyId, members) {
  const assignee = members.find(m => m.name === choreData.assignee);
  const now = new Date();
  
  let dueDate, completedAt;
  
  if (choreData.dueTime) {
    dueDate = new Date(now);
    dueDate.setHours(parseInt(choreData.dueTime.split(':')[0]), parseInt(choreData.dueTime.split(':')[1]));
  }
  
  if (choreData.completedTime) {
    completedAt = new Date(now);
    completedAt.setHours(parseInt(choreData.completedTime.split(':')[0]), parseInt(choreData.completedTime.split(':')[1]));
  }
  
  return {
    _id: new mongoose.Types.ObjectId(),
    title: choreData.title,
    description: choreData.description,
    family: familyId,
    assignedTo: assignee._id,
    assignedBy: members.find(m => m.role === "parent")._id,
    category: choreData.category,
    status: choreData.status,
    dueDate: dueDate || new Date(now.getTime() + (2 * 60 * 60 * 1000)),
    completedAt: completedAt,
    points: {
      base: choreData.points,
      bonus: choreData.bonusPoints || 0,
      total: choreData.points + (choreData.bonusPoints || 0)
    },
    estimatedDuration: 20,
    difficulty: "medium",
    photoRequired: choreData.photoRequired !== false,
    metadata: {
      automation: choreData.automation,
      efficiency: choreData.efficiency,
      coordination: choreData.coordination,
      fairness: choreData.fairness,
      collaboration: choreData.collaboration,
      supervision: choreData.supervision,
      skills: choreData.skills,
      learning: choreData.learning
    },
    history: [{
      action: 'assigned',
      timestamp: new Date(now.getTime() - (2 * 60 * 60 * 1000)),
      user: members.find(m => m.role === "parent")._id,
      note: `Assigned for ${choreData.focus || 'demo'} scenario`
    }]
  };
}

/**
 * Create a demo scenario
 */
async function createScenario(scenarioKey) {
  try {
    const scenario = DEMO_SCENARIOS[scenarioKey];
    if (!scenario) {
      throw new Error(`Scenario ${scenarioKey} not found`);
    }
    
    console.log(`🎬 Creating ${scenario.name} scenario...`);
    console.log(`Focus: ${scenario.focus}`);
    console.log(`Audience: ${scenario.audience}`);
    
    // Create family
    const family = new Family({
      name: scenario.name,
      description: scenario.description,
      metadata: {
        scenario: scenarioKey,
        focus: scenario.focus,
        audience: scenario.audience
      },
      settings: {
        pointsPerDollar: 10,
        allowanceDay: 'Sunday',
        maxDailyChores: 5,
        quietHours: { start: '20:00', end: '07:00' },
        photoRequired: true,
        timezone: 'America/New_York'
      },
      members: [],
      createdAt: new Date(Date.now() - (30 * 24 * 60 * 60 * 1000))
    });
    
    const savedFamily = await family.save();
    
    // Create members
    const members = [];
    for (const memberData of scenario.members) {
      const hashedPassword = await bcrypt.hash(DEMO_PASSWORD, 12);
      
      const user = new User({
        name: memberData.name,
        email: memberData.email,
        password: hashedPassword,
        role: memberData.role,
        familyId: savedFamily._id,
        hasAccess: true,
        emailVerified: new Date(),
        profile: {
          avatar: `/avatars/${memberData.role}-${memberData.name.toLowerCase().split(' ')[0]}.png`,
          age: memberData.age,
          personality: memberData.personality,
          highlights: memberData.highlights
        },
        gamification: {
          totalPoints: memberData.role === 'child' ? 
            (memberData.age ? memberData.age * 100 : 1000) : 500,
          currentStreak: Math.floor(Math.random() * 10) + 1,
          level: memberData.role === 'child' ? 
            Math.floor(memberData.age ? memberData.age / 2 : 5) : 5,
          achievements: []
        }
      });
      
      const savedUser = await user.save();
      members.push(savedUser);
      
      savedFamily.members.push({
        user: savedUser._id,
        role: memberData.role,
        joinedAt: new Date(Date.now() - (25 * 24 * 60 * 60 * 1000)),
        permissions: memberData.role === 'parent' ? 
          ['manage_family', 'create_chores', 'approve_chores', 'view_analytics'] :
          ['complete_chores', 'view_progress']
      });
      
      console.log(`✅ Created ${memberData.name} (${memberData.role})`);
    }
    
    await savedFamily.save();
    
    // Create scenario-specific chores
    const chores = generateScenarioChores(scenario, savedFamily._id, members);
    if (chores.length > 0) {
      await Chore.insertMany(chores);
      console.log(`✅ Created ${chores.length} scenario chores`);
    }
    
    console.log(`🎯 ${scenario.name} scenario created successfully!`);
    return savedFamily;
    
  } catch (error) {
    console.error(`❌ Error creating scenario ${scenarioKey}:`, error);
    throw error;
  }
}

/**
 * Create all demo scenarios
 */
async function createAllScenarios() {
  try {
    console.log('🚀 Creating all demo scenarios...');
    
    await connectMongo();
    
    // Clean existing demo scenarios
    await User.deleteMany({ email: { $regex: /@.*demo\.com$/ } });
    await Family.deleteMany({ name: { $regex: /johnson|garcia|williams|chen/i } });
    
    const scenarios = [];
    for (const scenarioKey of Object.keys(DEMO_SCENARIOS)) {
      const scenario = await createScenario(scenarioKey);
      scenarios.push(scenario);
    }
    
    console.log('\n🎬 All demo scenarios created successfully!');
    console.log('\n📋 Demo Scenario Summary:');
    
    for (const scenario of scenarios) {
      const memberCount = scenario.members.length;
      console.log(`\n${scenario.name}:`);
      console.log(`  Members: ${memberCount}`);
      console.log(`  Focus: ${scenario.metadata.focus}`);
      console.log(`  Audience: ${scenario.metadata.audience}`);
    }
    
    console.log('\n🔐 Demo Login Pattern:');
    console.log('Email format: [firstname]@[scenario]demo.com');
    console.log('Password: Demo2024!');
    console.log('\nExamples:');
    console.log('- sarah@demo.com (Johnson family)');
    console.log('- maria@busydemo.com (Garcia family)');
    console.log('- jen@complexdemo.com (Williams family)');
    console.log('- lisa@educationdemo.com (Chen family)');
    
  } catch (error) {
    console.error('❌ Error creating demo scenarios:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n🔌 Database connection closed');
  }
}

// Command line interface
const command = process.argv[2];

if (command === 'all') {
  createAllScenarios();
} else if (command && DEMO_SCENARIOS[command]) {
  (async () => {
    await connectMongo();
    await createScenario(command);
    await mongoose.connection.close();
  })();
} else {
  console.log('🎬 ChoreMinder Demo Scenarios');
  console.log('');
  console.log('Usage:');
  console.log('  npm run demo:scenarios all       - Create all scenarios');
  console.log('  npm run demo:scenarios johnson   - Johnson family (comprehensive)');
  console.log('  npm run demo:scenarios garcia    - Garcia family (efficiency)');
  console.log('  npm run demo:scenarios williams  - Williams family (coordination)');
  console.log('  npm run demo:scenarios chen      - Chen family (educational)');
  console.log('');
  console.log('Available Scenarios:');
  for (const [key, scenario] of Object.entries(DEMO_SCENARIOS)) {
    console.log(`  ${key.padEnd(10)} - ${scenario.description}`);
  }
}

export { createAllScenarios, createScenario, DEMO_SCENARIOS };