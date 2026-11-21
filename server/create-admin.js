import { createInterface } from 'node:readline/promises';
import { stdin, stdout } from 'node:process';
import { Writable } from 'node:stream';
import { connectDatabase } from './database.js';
import { createUser } from './domain.js';

// A separate CLI is the only way to create an administrator. Public sign-up
// always creates a student, regardless of any role sent by the browser.
async function promptPassword() {
  stdout.write('Admin password (at least 8 characters): ');
  const hiddenOutput = new Writable({
    write(_chunk, _encoding, callback) {
      callback();
    },
  });
  const terminal = createInterface({ input: stdin, output: hiddenOutput, terminal: true });
  try {
    const value = await terminal.question('');
    stdout.write('\n');
    return value;
  } finally {
    terminal.close();
  }
}

let database;
try {
  let email = process.env.CREATE_ADMIN_EMAIL;
  let password = process.env.CREATE_ADMIN_PASSWORD;
  let name = process.env.CREATE_ADMIN_NAME || 'NoteHub Admin';
  if ((!email || !password) && !stdin.isTTY)
    throw new Error(
      'Set CREATE_ADMIN_EMAIL and CREATE_ADMIN_PASSWORD, or run this command in an interactive terminal.',
    );
  if (!email) {
    const terminal = createInterface({ input: stdin, output: stdout });
    try {
      email = await terminal.question('Admin email: ');
      name = (await terminal.question('Admin name [NoteHub Admin]: ')) || name;
    } finally {
      terminal.close();
    }
  }
  if (!password) password = await promptPassword();
  database = await connectDatabase();
  const user = await createUser(
    database.db,
    {
      fullName: name,
      email,
      studentId: `ADMIN-${email.trim().toLowerCase()}`,
      phone: '+0000000000',
      university: 'NoteHub',
      faculty: 'Science & Engineering',
      department: 'Administration',
      semester: '1',
      password,
      confirmPassword: password,
    },
    'admin',
  );
  console.info(`Administrator created: ${user.email}. Log in through the app.`);
} catch (error) {
  console.error(
    error.code === 11000
      ? 'An account with that email or ID already exists. Choose a different administrator email.'
      : `Could not create administrator: ${error.message}`,
  );
  process.exitCode = 1;
} finally {
  if (database) await database.client.close();
}
