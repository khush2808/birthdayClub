// Test script to demonstrate security features
const testCases = [
  {
    name: "Valid Registration",
    data: {
      name: "John Doe",
      email: "john@example.com", 
      dateOfBirth: "1990-05-15"
    },
    expected: "Should pass validation"
  },
  {
    name: "Invalid Email",
    data: {
      name: "John Doe",
      email: "invalid-email",
      dateOfBirth: "1990-05-15"
    },
    expected: "Should fail email validation"
  },
  {
    name: "XSS Attempt",
    data: {
      name: "<script>alert('xss')</script>",
      email: "test@example.com",
      dateOfBirth: "1990-05-15"
    },
    expected: "Should sanitize malicious input"
  },
  {
    name: "Bot Detection (Honeypot)",
    data: {
      name: "Bot User",
      email: "bot@example.com",
      dateOfBirth: "1990-05-15",
      website: "http://spam.com"
    },
    expected: "Should be detected as bot"
  },
  {
    name: "Future Date",
    data: {
      name: "Time Traveler",
      email: "future@example.com",
      dateOfBirth: "2030-05-15"
    },
    expected: "Should fail date validation"
  }
];

console.log("🔐 Birthday Club Security Test Cases");
console.log("=====================================\n");

testCases.forEach((test, index) => {
  console.log(`${index + 1}. ${test.name}`);
  console.log(`   Data: ${JSON.stringify(test.data)}`);
  console.log(`   Expected: ${test.expected}`);
  console.log("");
});

console.log("📝 To test these cases:");
console.log("1. Start the development server: npm run dev");
console.log("2. Use curl or Postman to test each endpoint");
console.log("3. Observe validation errors and security logging");
console.log("\n✅ Security implementation complete!");
