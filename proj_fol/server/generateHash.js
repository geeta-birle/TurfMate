const bcrypt = require('bcryptjs');

async function main() {
  const password = 'Test1234';
  const salt = await bcrypt.genSalt(12);
  const hash = await bcrypt.hash(password, salt);
  console.log('Password:', password);
  console.log('Hash:', hash);

  // Verify it works
  const isMatch = await bcrypt.compare(password, hash);
  console.log('Verify:', isMatch);
}

main();