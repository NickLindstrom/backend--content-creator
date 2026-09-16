const { Resend } = require("resend");

const env = require("../../config/env");

let resendClient = null;

function getResendClient() {
  if (!env.RESEND_API_KEY) {
    const error = new Error("RESEND_API_KEY is not configured");
    error.statusCode = 500;
    throw error;
  }

  if (!resendClient) {
    resendClient = new Resend(env.RESEND_API_KEY);
  }

  return resendClient;
}

async function sendEmail({
  to,
  from,
  subject,
  html,
  text,
  attachments = [],
  idempotencyKey,
}) {
  if (!from) {
    const error = new Error("RESEND_FROM_EMAIL is not configured");
    error.statusCode = 500;
    throw error;
  }

  const resend = getResendClient();
  const { data, error } = await resend.emails.send(
    {
      from,
      to,
      subject,
      html,
      text,
      attachments,
    },
    {
      idempotencyKey,
    },
  );

  if (error) {
    const resendError = new Error(
      error.message || "Failed to send Resend email",
    );
    resendError.statusCode = 502;
    resendError.details = error;
    throw resendError;
  }

  return data;
}

module.exports = {
  sendEmail,
};
