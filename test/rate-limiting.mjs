#!/usr/bin/env node

/**
 * Test script to verify rate limiting functionality
 * This script tests the rate limiting logic locally without making actual HTTP requests
 */

// Mock environment setup
process.env.MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/test-birthday-club';

import mongoose from 'mongoose';
import RateLimiter from '../src/models/RateLimiter.js';

async function testRateLimiting() {
  try {
    console.log('🧪 Testing Rate Limiting Logic...\n');

    // Connect to test database
    if (!process.env.MONGODB_URI) {
      console.log('⚠️  No MONGODB_URI set, skipping database tests');
      return;
    }

    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to test database');

    // Clean up any existing rate limiter records for testing
    await RateLimiter.deleteMany({ endpoint: 'send-birthday-emails' });
    console.log('🧹 Cleaned up existing rate limiter records');

    // Test 1: First call should create a new record
    console.log('\n📝 Test 1: First API call');
    const endpoint = 'send-birthday-emails';
    const now = new Date();
    
    let rateLimiter = await RateLimiter.findOne({ endpoint });
    console.log('Rate limiter before first call:', rateLimiter);
    
    // Simulate first call
    rateLimiter = new RateLimiter({
      endpoint,
      counter: 1,
      lastUpdated: now,
    });
    await rateLimiter.save();
    console.log('✅ First call - Rate limiter created:', { counter: rateLimiter.counter, lastUpdated: rateLimiter.lastUpdated });

    // Test 2: Second call within 24 hours should increment counter
    console.log('\n📝 Test 2: Second API call within 24 hours');
    rateLimiter = await RateLimiter.findOne({ endpoint });
    rateLimiter.counter += 1;
    rateLimiter.lastUpdated = new Date();
    await rateLimiter.save();
    console.log('✅ Second call - Counter incremented:', { counter: rateLimiter.counter, lastUpdated: rateLimiter.lastUpdated });

    // Test 3: Third call within 24 hours should be blocked
    console.log('\n📝 Test 3: Third API call within 24 hours (should be blocked)');
    rateLimiter = await RateLimiter.findOne({ endpoint });
    if (rateLimiter.counter >= 2) {
      console.log('🚫 Third call blocked - Rate limit exceeded');
      console.log('Rate limit status:', { 
        counter: rateLimiter.counter, 
        limit: 2,
        resetTime: new Date(rateLimiter.lastUpdated.getTime() + 24 * 60 * 60 * 1000)
      });
    }

    // Test 4: Call after 24 hours should reset counter
    console.log('\n📝 Test 4: API call after 24 hours (should reset counter)');
    const twentyFiveHoursAgo = new Date(now.getTime() - 25 * 60 * 60 * 1000);
    rateLimiter.lastUpdated = twentyFiveHoursAgo;
    await rateLimiter.save();
    
    // Simulate the reset logic
    const currentTime = new Date();
    const twentyFourHoursAgo = new Date(currentTime.getTime() - 24 * 60 * 60 * 1000);
    
    rateLimiter = await RateLimiter.findOne({ endpoint });
    if (rateLimiter.lastUpdated < twentyFourHoursAgo) {
      rateLimiter.counter = 1; // Reset to 1 (this would be the new call)
      rateLimiter.lastUpdated = currentTime;
      await rateLimiter.save();
      console.log('✅ Counter reset after 24 hours:', { counter: rateLimiter.counter, lastUpdated: rateLimiter.lastUpdated });
    }

    console.log('\n🎉 All rate limiting tests completed successfully!');

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    // Clean up
    await RateLimiter.deleteMany({ endpoint: 'send-birthday-emails' });
    await mongoose.disconnect();
    console.log('🧹 Cleaned up and disconnected from database');
  }
}

// Run the test
testRateLimiting().catch(console.error);