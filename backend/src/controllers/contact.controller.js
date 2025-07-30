const { sendMail } = require('../utils/mailer'); // adjust path if needed

async function sendContactMessage(request, reply) {
  const { name, email, message } = request.body;

  if (!name || !email || !message) {
    return reply.badRequest('All fields are required.');
  }

  try {
    await sendMail({
      to: process.env.EMAIL_USER, // Send contact form to yourself
      subject: `New Message from ${name}`,
      html: `
        <h3>New Contact Form Message</h3>
        <p><strong>Name:</strong> ${name}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Message:</strong></p>
        <p>${message}</p>
      `,
    });

    reply.send({ success: true, message: 'Message sent successfully' });
  } catch (error) {
    console.error('Failed to send contact form message:', error);
    reply.internalServerError('Failed to send email');
  }
}

module.exports = {
  sendContactMessage,
};
