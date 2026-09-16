const fs = require("node:fs");
const path = require("node:path");

const logoContent = fs
  .readFileSync(path.join(__dirname, "assets", "sajt24-logo.png"))
  .toString("base64");

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

  return sites
    .map((site) =>
      site.publicUrl
        ? `- ${site.displayName}: ${site.publicUrl}`
        : `- ${site.displayName}`,
    )
    .join("\n");
}

function renderSiteAdminAccessEmail({ appName, email, setupLink, sites }) {
  const safeAppName = escapeHtml(appName);
  const siteCount = sites.length;
  const siteWord = siteCount === 1 ? "webbplats" : "webbplatser";
  const companyName = sites[0].displayName;
  const publicUrl = sites[0].publicUrl;
  const html = `<!doctype html>
<html lang="sv">
  <body style="margin: 0; padding: 0; background: #f8fafc; font-family: Arial, sans-serif; color: #0f172a;">
    <div style="max-width: 640px; margin: 0; padding: 32px 20px;">
      <div style="background: #ffffff; border: 1px solid #e2e8f0; padding: 28px;">
        <p style="margin: 0 0 10px; color: #475569; font-size: 14px;">${safeAppName}</p>
        <h1 style="margin: 0; font-size: 26px; line-height: 1.25;">Hej ${companyName},</h1>
        <p style="margin: 18px 0 0; color: #334155; line-height: 1.6;">
          Jag heter Nick och har ${safeAppName}, vi har tagit fram ett förslag på en ny hemsida för ${companyName} 
          som ni redan nu kan titta på och testa.
        </p>
        <p style="margin: 24px 0 0; color: #334155; line-height: 1.6;">
          Ni hittar hemsidan här:
          <a href="${escapeHtml(publicUrl)}" style="">
            ${companyName} - Demowebb
          </a>
        </p>
        <p style="margin: 24px 0 0; color: #334155; line-height: 1.6;">
          Vi har utgått från den information vi kunnat hitta om verksamheten och byggt sidan för att ge en tydlig, modern och informativ presentation av företaget.
        </p>
        <p style="margin: 24px 0 0; color: #334155; line-height: 1.6;">
          Till hemsidan hör även ett enkelt administrationsgränssnitt där ni själva kan prova att ändra exempelvis texter, tjänster, bilder och annan information och direkt se hur ändringarna påverkar hemsidan.
        </p>
        <p style="margin: 24px 0 0; color: #334155; line-height: 1.6;">
          Ni kan testa administrationsverktyget och logga in via länken här:
          <a href="${escapeHtml(setupLink)}" style="">
            ${companyName} - Demo Administrationsverktyg
          </a>
        </p>
        <p style="margin: 24px 0 0; color: #334155; line-height: 1.6;">
          Första gången ni öppnar länken får ni välja ett eget lösenord. Er e-postadress fungerar sedan som användarnamn.
        </p>
        <p style="margin: 24px 0 0; color: #334155; line-height: 1.6;">
          Det kostar ingenting att titta på eller testa hemsidan och administrationsverktyget.
        </p>
        <p style="margin: 24px 0 0; color: #334155; line-height: 1.6;">
          Vi kommer att ringa er på fredag mellan kl. 13-15 för att höra vad ni tycker om förslaget och svara på eventuella frågor.
        </p>
        <p style="margin: 24px 0 0; color: #334155; line-height: 1.6;">
          Om tiden inte passar får ni gärna svara på det här mejlet med en tid som passar bättre. Ni är självklart också välkomna att svara direkt om ni har några frågor eller funderingar kring hemsidan.
        </p>
        <p style="margin: 24px 0 0; color: #334155; line-height: 1.6;">
        Med vänliga hälsningar,
        </p>
        <p style="margin: 0 0 0; color: #334155; line-height: 1.6;">
          Nick på Sajt24.se
        </p>
        <img
          src="cid:sajt24-logo"
          alt="Sajt24"
          width="120"
          style="display:block; margin-top:20px; width:120px; height:auto;"
        />
      </div>
    </div>
  </body>
</html>`;

  //  <p style="margin: 28px 0;">
  //           <a href="${escapeHtml(setupLink)}" style="display: inline-block; background: #2563eb; color: #ffffff; text-decoration: none; padding: 12px 18px; font-weight: 700;">
  //             Välj lösenord
  //           </a>
  //         </p>
  //         <p style="margin: 0; color: #64748b; font-size: 13px; line-height: 1.5;">
  //           Om knappen inte fungerar kan du kopiera länken här:<br>
  //           <a href="${escapeHtml(setupLink)}" style="color: #2563eb;">${escapeHtml(setupLink)}</a>
  //         </p>
  const text = [
    `${appName} - Du har fått åtkomst`,
    "",
    `Hej! Ett konto har skapats för ${email}.`,
    `Du har fått åtkomst till ${siteCount} ${siteWord}:`,
    renderSiteListText(sites),
    "",
    "Välj lösenord och logga in första gången via länken:",
    setupLink,
  ]
    .filter(Boolean)
    .join("\n");

  return {
    html,
    text,
    attachments: [
      {
        content: logoContent,
        filename: "sajt24-logo.png",
        contentId: "sajt24-logo",
      },
    ],
  };
}

module.exports = {
  renderSiteAdminAccessEmail,
};
