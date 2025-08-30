# Test the security improvements without external dependencies

cd /home/runner/work/birthdayClub/birthdayClub

# Create a minimal test setup
export NODE_ENV=development

# Test the validation functions directly
node -e "
const { registerSchema } = require('./src/lib/validation.ts');
const { validateHoneypot } = require('./src/lib/security.ts');

// Test valid input
try {
  const valid = registerSchema.parse({
    name: 'John Doe',
    email: 'john@example.com',
    dateOfBirth: '1990-05-15'
  });
  console.log('✅ Valid input test passed');
} catch (e) {
  console.log('❌ Valid input test failed:', e.message);
}

// Test invalid email
try {
  registerSchema.parse({
    name: 'John Doe', 
    email: 'invalid-email',
    dateOfBirth: '1990-05-15'
  });
  console.log('❌ Invalid email test failed - should have thrown error');
} catch (e) {
  console.log('✅ Invalid email test passed - correctly rejected');
}

// Test honeypot detection
const botRequest = { name: 'John', email: 'john@example.com', dateOfBirth: '1990-01-01', website: 'spam.com' };
const humanRequest = { name: 'John', email: 'john@example.com', dateOfBirth: '1990-01-01' };

if (!validateHoneypot(botRequest)) {
  console.log('✅ Bot detection test passed');
} else {
  console.log('❌ Bot detection test failed');
}

if (validateHoneypot(humanRequest)) {
  console.log('✅ Human validation test passed');
} else {
  console.log('❌ Human validation test failed');
}
"