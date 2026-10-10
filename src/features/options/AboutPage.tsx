import { t } from "~shared/i18n"

const ABOUT_CONTACT_EMAIL = "sxqsdbu@gmail.com"
/** Fixed English product name for Outlook rules; do not localize. */
const ABOUT_CONTACT_SUBJECT = "GatherStack-"
const ABOUT_GITHUB_URL = "https://github.com/geraldqin/gatherstack"
const ABOUT_GITHUB_LABEL = "GatherStack"

function readExtensionVersion(): string {
  try {
    const version = chrome.runtime?.getManifest?.().version
    return typeof version === "string" && version.trim() ? version.trim() : ""
  } catch {
    return ""
  }
}

const aboutLinkClassName =
  "text-sky-700 underline decoration-sky-400 underline-offset-2 hover:text-sky-950"

function AboutContactBody() {
  const text = t("optionsAboutContact", [
    ABOUT_CONTACT_EMAIL,
    ABOUT_CONTACT_SUBJECT
  ])
  const githubText = t("optionsAboutGithub", [ABOUT_GITHUB_LABEL])
  const emailIndex = text.indexOf(ABOUT_CONTACT_EMAIL)
  const githubIndex = githubText.indexOf(ABOUT_GITHUB_LABEL)

  return (
    <div className="space-y-2">
      {emailIndex < 0 ? (
        <p>{text}</p>
      ) : (
        <p>
          {text.slice(0, emailIndex)}
          <a
            className={aboutLinkClassName}
            href={`mailto:${ABOUT_CONTACT_EMAIL}?subject=${encodeURIComponent(ABOUT_CONTACT_SUBJECT)}`}>
            {ABOUT_CONTACT_EMAIL}
          </a>
          {text.slice(emailIndex + ABOUT_CONTACT_EMAIL.length)}
        </p>
      )}
      {githubIndex < 0 ? (
        <p>{githubText}</p>
      ) : (
        <p>
          {githubText.slice(0, githubIndex)}
          <a
            className={aboutLinkClassName}
            href={ABOUT_GITHUB_URL}
            target="_blank"
            rel="noopener noreferrer">
            {ABOUT_GITHUB_LABEL}
          </a>
          {githubText.slice(githubIndex + ABOUT_GITHUB_LABEL.length)}
        </p>
      )}
    </div>
  )
}

export function AboutPage() {
  const version = readExtensionVersion()

  return (
    <main className="min-w-0 flex-1 overflow-y-auto p-8">
      <article className="max-w-2xl">
        <h1 className="text-xl font-semibold text-slate-900">
          {t("optionsAboutProductName")}
        </h1>

        <h2 className="mb-2 mt-8 text-sm font-semibold text-slate-900">
          {t("optionsAboutCoreHeading")}
        </h2>
        <p className="text-sm leading-relaxed text-slate-600">
          {t("optionsAboutDescription")}
        </p>
        <p className="mt-2 text-sm leading-relaxed text-slate-600">
          {t("optionsAboutWhatExtra")}
        </p>

        <h2 className="mb-2 mt-8 text-sm font-semibold text-slate-900">
          {t("optionsAboutInspirationHeading")}
        </h2>
        <div className="space-y-2 text-sm leading-relaxed text-slate-600">
          <p>{t("optionsAboutInspirationP1")}</p>
          <p>{t("optionsAboutInspirationP2")}</p>
          <p>{t("optionsAboutInspirationP3")}</p>
          <p>{t("optionsAboutInspirationP4")}</p>
          <p>{t("optionsAboutInspirationP5")}</p>
        </div>

        <h2 className="mb-2 mt-8 text-sm font-semibold text-slate-900">
          {t("optionsAboutHowHeading")}
        </h2>
        <ol className="list-decimal space-y-3 pl-5 text-sm leading-relaxed text-slate-600">
          <li>
            {t("optionsAboutHowStep1", [
              t("optionsNavSettings"),
              t("optionsSettingsSectionModel")
            ])}
          </li>
          <li>{t("optionsAboutHowStep2")}</li>
          <li className="space-y-2">
            <p>
              {t("optionsAboutHowStep3", [t("sidepanelReadPage")])}
            </p>
            <p>{t("optionsAboutHowStep3Note")}</p>
            <p>{t("optionsAboutHowStep3SkillLimit")}</p>
          </li>
          <li>
            {t("optionsAboutHowStep4", [
              t("sidepanelStoreMessage"),
              t("optionsNavData"),
              t("dataExportToSidepanel")
            ])}
          </li>
        </ol>

        <h2 className="mb-2 mt-8 text-sm font-semibold text-slate-900">
          {t("optionsAboutSendModeHeading")}
        </h2>
        <p className="text-sm leading-relaxed text-slate-600">
          {t("optionsAboutSendModeIntro")}
        </p>
        <ul className="mt-2 list-disc space-y-2 pl-5 text-sm leading-relaxed text-slate-600">
          <li>{t("optionsAboutSendModeChat", [t("sendModeChatLabel")])}</li>
          <li>
            {t("optionsAboutSendModeDirect", [t("sendModeDirectStoreLabel")])}
          </li>
          <li>
            {t("optionsAboutSendModeAsync", [t("sendModeAsyncParseLabel")])}
          </li>
          <li>
            {t("optionsAboutSendModeOneClick", [t("sendModeOneClickCollectLabel")])}
          </li>
        </ul>
        <p className="mt-3 text-sm leading-relaxed text-slate-600">
          {t("optionsAboutSendModeHint")}
        </p>

        <h2 className="mb-2 mt-8 text-sm font-semibold text-slate-900">
          {t("optionsAboutPrivacyHeading")}
        </h2>
        <div className="space-y-2 text-sm leading-relaxed text-slate-600">
          <p>{t("optionsAboutPrivacyP1")}</p>
          <p>{t("optionsAboutPrivacyP2")}</p>
          <p>{t("optionsAboutPrivacyP3")}</p>
          <p>{t("optionsAboutPrivacyP4")}</p>
        </div>

        <h2 className="mb-2 mt-8 text-sm font-semibold text-slate-900">
          {t("optionsAboutPricingHeading")}
        </h2>
        <div className="space-y-2 text-sm leading-relaxed text-slate-600">
          <p>{t("optionsAboutPricingP1")}</p>
          <p>{t("optionsAboutPricingP2")}</p>
        </div>

        <h2 className="mb-2 mt-8 text-sm font-semibold text-slate-900">
          {t("optionsAboutContactHeading")}
        </h2>
        <div className="text-sm leading-relaxed text-slate-600">
          <AboutContactBody />
        </div>

        <footer className="mt-10 space-y-1 border-t border-slate-200 pt-4 text-xs leading-relaxed text-slate-400">
          {version ? <p>{t("optionsAboutVersion", [version])}</p> : null}
          <p>{t("optionsAboutBuiltWith")}</p>
        </footer>
      </article>
    </main>
  )
}
