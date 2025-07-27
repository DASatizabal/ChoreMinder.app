#!/usr/bin/env node

/**
 * ChoreMinder Demo Data Reset Script
 * 
 * Resets demo data to initial state for fresh demonstrations
 * Preserves family structure but refreshes activity patterns
 */

import connectMongo from '../libs/mongoose.ts';
import User from '../models/User.ts';
import Family from '../models/Family.ts';
import Chore from '../models/Chore.ts';
import { createDemoData } from './create-demo-data.js';

/**
 * Quick reset for between demos
 */
async function quickReset() {
  try {
    console.log('🔄 Quick demo reset starting...');
    
    await connectMongo();
    
    // Find demo family
    const demoFamily = await Family.findOne({ name: /johnson/i });
    if (!demoFamily) {
      console.log('❌ No demo family found. Run create-demo-data.js first.');
      return;
    }
    
    // Reset active chores to pending status
    await Chore.updateMany(
      { 
        family: demoFamily._id,
        status: { $in: ['in_progress', 'completed'] },
        dueDate: { $gte: new Date() }
      },
      { 
        status: 'pending',
        $unset: { 
          completedAt: 1, 
          approvedAt: 1, 
          approvedBy: 1 
        }
      }
    );
    
    // Reset current challenge progress to demo-ready state
    await Family.updateOne(
      { _id: demoFamily._id },
      { 
        $set: { 
          'challenges.0.current': 45,
          'challenges.0.progress': [
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
      }
    );
    
    console.log('✅ Quick reset completed');
    console.log('🎬 Demo ready for presentation');
    
  } catch (error) {
    console.error('❌ Error during quick reset:', error);
  }
}

/**
 * Full reset - recreates all demo data
 */
async function fullReset() {
  try {
    console.log('🔄 Full demo reset starting...');
    console.log('⚠️  This will completely recreate all demo data');
    
    await createDemoData();
    
    console.log('✅ Full reset completed');
    
  } catch (error) {
    console.error('❌ Error during full reset:', error);
  }
}

/**
 * Simulate demo progression for testing
 */
async function simulateDemo() {
  try {
    console.log('🎮 Simulating demo progression...');
    
    await connectMongo();
    
    const demoFamily = await Family.findOne({ name: /johnson/i });
    if (!demoFamily) {
      console.log('❌ No demo family found. Run create-demo-data.js first.');
      return;
    }
    
    // Find Emma and a pending chore
    const emma = await User.findOne({ email: 'emma@demo.com' });
    const pendingChore = await Chore.findOne({
      assignedTo: emma._id,
      status: 'pending',
      dueDate: { $gte: new Date() }
    });
    
    if (pendingChore) {
      // Simulate chore completion
      pendingChore.status = 'completed';
      pendingChore.completedAt = new Date();
      pendingChore.history.push({
        action: 'completed',
        timestamp: new Date(),
        user: emma._id,
        note: 'Demo completion - task done with photo verification'
      });
      
      await pendingChore.save();
      console.log(`✅ Simulated completion of: ${pendingChore.title}`);
      
      // Update challenge progress
      await Family.updateOne(
        { _id: demoFamily._id },
        { $inc: { 'challenges.0.current': 1 } }
      );
      console.log('📈 Updated challenge progress');
    }
    
    console.log('🎬 Demo simulation completed');
    
  } catch (error) {
    console.error('❌ Error during demo simulation:', error);
  }
}

// Command line interface
const command = process.argv[2];

switch (command) {
  case 'quick':
    quickReset();
    break;
  case 'full': 
    fullReset();
    break;
  case 'simulate':
    simulateDemo();
    break;
  default:
    console.log('🎬 ChoreMinder Demo Reset Tool');
    console.log('');
    console.log('Usage:');
    console.log('  npm run demo:reset quick    - Quick reset for between demos');
    console.log('  npm run demo:reset full     - Full recreate of all demo data');
    console.log('  npm run demo:reset simulate - Simulate demo progression');
    console.log('');
    console.log('Demo Credentials:');
    console.log('  Parent: sarah@demo.com / Demo2024!');
    console.log('  Child:  emma@demo.com / Demo2024!');
}

export { quickReset, fullReset, simulateDemo };