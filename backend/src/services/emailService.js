import { env } from '../config/env.js'

export function isBrevoConfigured() {
  return Boolean(env.brevoApiKey && env.brevoSenderEmail)
}

export async function sendStudentWelcomeEmail({
  recipientEmail,
  defaultPassword,
  subjectLabels,
}) {
  if (!isBrevoConfigured()) {
    return {
      sent: false,
      reason: 'Brevo email settings are not configured.',
    }
  }

  const subjectListMarkup = subjectLabels.length
    ? subjectLabels.map((label) => `<li>${escapeHtml(label)}</li>`).join('')
    : '<li>No subjects assigned yet</li>'
  const subjectIntro = subjectLabels.length
    ? `You have been added to the following subject${subjectLabels.length === 1 ? '' : 's'}:`
    : 'You can complete subject assignment later. Current status:'
  const studentPortalUrl = getStudentPortalUrl()

  let response

  try {
    response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        accept: 'application/json',
        'api-key': env.brevoApiKey,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        sender: {
          email: env.brevoSenderEmail,
          name: env.brevoSenderName,
        },
        to: [
          {
            email: recipientEmail,
          },
        ],
        subject: 'Your Student Portal Access Details',
        htmlContent: `
          <html>
            <body style="font-family: Arial, sans-serif; color: #1f1f1f; line-height: 1.5;">
              <p>Hello,</p>
              <p>Your student access has been created for the St. Anthony College portal.</p>
              <p><strong>Login email:</strong> ${escapeHtml(recipientEmail)}<br />
              <strong>Default password:</strong> ${escapeHtml(defaultPassword)}</p>
              <p><strong>Student portal:</strong>
              <a href="${escapeHtml(studentPortalUrl)}">${escapeHtml(studentPortalUrl)}</a></p>
              <p>${subjectIntro}</p>
              <ul>${subjectListMarkup}</ul>
              <p>Please keep these credentials safe. Your remaining profile details can be completed during student onboarding.</p>
            </body>
          </html>
        `,
        textContent: [
          'Hello,',
          '',
          'Your student access has been created for the St. Anthony College portal.',
          `Login email: ${recipientEmail}`,
          `Default password: ${defaultPassword}`,
          `Student portal: ${studentPortalUrl}`,
          '',
          `Assigned subjects: ${subjectLabels.length ? subjectLabels.join(', ') : 'No subjects assigned yet'}`,
          '',
          'Please keep these credentials safe. Your remaining profile details can be completed during student onboarding.',
        ].join('\n'),
      }),
    })
  } catch (error) {
    return {
      sent: false,
      reason:
        error instanceof Error
          ? `Brevo request failed: ${error.message}`
          : 'Brevo request failed before a response was received.',
    }
  }

  if (!response.ok) {
    let details = ''

    try {
      const payload = await response.json()
      details = payload?.message || JSON.stringify(payload)
    } catch {
      details = await response.text()
    }

    return {
      sent: false,
      reason: details || `Brevo request failed with ${response.status}.`,
    }
  }

  const payload = await response.json()

  return {
    sent: true,
    messageId: payload?.messageId ?? '',
  }
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

function getStudentPortalUrl() {
  return String(env.frontendOrigin || 'http://localhost:5173').trim()
}
