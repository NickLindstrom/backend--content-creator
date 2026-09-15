function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function renderSiteListHtml(sites) {
  if (!sites.length) {
    return "";
  }

  return `
    <ul style="margin: 16px 0 0; padding-left: 20px; color: #334155;">
      ${sites.map((site) => `<li>${escapeHtml(site.displayName)}</li>`).join("")}
    </ul>
  `;
}

function renderSiteListText(sites) {
  if (!sites.length) {
    return "";
  }

  return sites.map((site) => `- ${site.displayName}`).join("\n");
}

function renderSiteAdminAccessEmail({ appName, email, setupLink, sites }) {
  const safeAppName = escapeHtml(appName);
  const siteCount = sites.length;
  const siteWord = siteCount === 1 ? "webbplats" : "webbplatser";
  const html = `<!doctype html>
<html lang="sv">
  <body style="margin: 0; padding: 0; background: #f8fafc; font-family: Arial, sans-serif; color: #0f172a;">
    <div style="max-width: 640px; margin: 0 auto; padding: 32px 20px;">
      <div style="background: #ffffff; border: 1px solid #e2e8f0; padding: 28px;">
        <p style="margin: 0 0 10px; color: #475569; font-size: 14px;">${safeAppName}</p>
        <h1 style="margin: 0; font-size: 26px; line-height: 1.25;">Du har fått åtkomst</h1>
        <p style="margin: 18px 0 0; color: #334155; line-height: 1.6;">
          Hej! Ett konto har skapats för ${escapeHtml(email)}. Du har fått åtkomst till ${siteCount} ${siteWord} i ${safeAppName}.
        </p>
        ${renderSiteListHtml(sites)}
        <p style="margin: 24px 0 0; color: #334155; line-height: 1.6;">
          Klicka på knappen nedan för att välja ditt lösenord och logga in första gången.
        </p>
        <p style="margin: 28px 0;">
          <a href="${escapeHtml(setupLink)}" style="display: inline-block; background: #2563eb; color: #ffffff; text-decoration: none; padding: 12px 18px; font-weight: 700;">
            Välj lösenord
          </a>
        </p>
        <p style="margin: 0; color: #64748b; font-size: 13px; line-height: 1.5;">
          Om knappen inte fungerar kan du kopiera länken här:<br>
          <a href="${escapeHtml(setupLink)}" style="color: #2563eb;">${escapeHtml(setupLink)}</a>
        </p>
      </div>
    </div>
  </body>
</html>`;

  const text = [
    `${appName} - Du har fått åtkomst`,
    "",
    `Hej! Ett konto har skapats för ${email}.`,
    `Du har fått åtkomst till ${siteCount} ${siteWord}:`,
    renderSiteListText(sites),
    "",
    "Välj lösenord och logga in första gången via länken:",
    setupLink
  ].filter(Boolean).join("\n");

  return {
    html,
    text
  };
}

module.exports = {
  renderSiteAdminAccessEmail
};
