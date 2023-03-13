/*
 *  This file is part of CoCalc: Copyright © 2020 Sagemath, Inc.
 *  License: AGPLv3 s.t. "Commons Clause" – see LICENSE.md for details
 */

// Site Settings Config for the servers (hubs)
// They are only visible and editable for admins and services.
// In particular, this includes the email backend config, Stripe, etc.

// You can use markdown in the descriptions below and it is rendered properly!

import {
  Config,
  is_email_enabled,
  only_for_smtp,
  only_for_sendgrid,
  only_for_password_reset_smtp,
  to_bool,
  only_booleans,
  to_int,
  only_nonneg_int,
  only_commercial,
} from "./site-defaults";

import { is_valid_email_address, expire_time } from "@cocalc/util/misc";

export const pii_retention_parse = (retention: string): number | false => {
  if (retention == "never" || retention == null) return false;
  const [num_str, mult_str] = retention.split(" ");
  const num = parseInt(num_str);
  const mult = (function () {
    const m = mult_str.toLowerCase();
    if (m.startsWith("year")) return 365;
    if (m.startsWith("month")) return 30;
    if (m.startsWith("day")) return 1;
    throw new Error(`unknown multiplyer "${m}"`);
  })();
  const secs = num * (mult * 24 * 60 * 60);
  if (isNaN(secs) || secs == null) {
    throw new Error(
      `pii_expire problem: cannot derive future time from "{retention}"`
    );
  }
  return secs;
};

const pii_retention_display = (retention: string) => {
  const secs = pii_retention_parse(retention);
  if (secs === false) {
    return "will never expire";
  } else {
    return `Future date ${expire_time(secs).toLocaleString()}`;
  }
};

export type SiteSettingsExtrasKeys =
  | "pii_retention"
  | "stripe_heading"
  | "stripe_publishable_key"
  | "stripe_secret_key"
  | "re_captcha_v3_heading"
  | "re_captcha_v3_publishable_key"
  | "re_captcha_v3_secret_key"
  | "email_section"
  | "email_backend"
  | "sendgrid_key"
  | "email_smtp_server"
  | "email_smtp_from"
  | "email_smtp_login"
  | "email_smtp_password"
  | "email_smtp_port"
  | "email_smtp_secure"
  | "openai_section"
  | "openai_api_key"
  | "password_reset_override"
  | "password_reset_smtp_server"
  | "password_reset_smtp_from"
  | "password_reset_smtp_login"
  | "password_reset_smtp_password"
  | "password_reset_smtp_port"
  | "password_reset_smtp_secure"
  | "zendesk_heading"
  | "zendesk_token"
  | "zendesk_username"
  | "zendesk_uri"
  | "github_heading"
  | "github_project_id"
  | "github_username"
  | "github_token"
  | "prometheus_metrics";

export type SettingsExtras = Record<SiteSettingsExtrasKeys, Config>;

// not public, but admins can edit them
export const EXTRAS: SettingsExtras = {
  pii_retention: {
    name: "PII Retention",
    desc: "How long to keep personally identifiable information, after which the server automatically deletes certain database entries that contain PII.",
    default: "never",
    // values must be understood by packages/hub/utils.ts pii_expire
    valid: [
      "never",
      "30 days",
      "3 month",
      "6 month",
      "1 year",
      "2 years",
      "5 years",
      "10 years",
    ],
    to_val: pii_retention_parse,
    to_display: pii_retention_display,
  },
  stripe_heading: {
    // this is consmetic, otherwise it looks weird.
    name: "Stripe Keys",
    desc: "",
    default: "",
    show: only_commercial,
    type: "header",
  },
  stripe_publishable_key: {
    name: "Stripe Publishable",
    desc: "Stripe calls this key 'publishable'",
    default: "",
    password: false,
    show: only_commercial,
  },
  stripe_secret_key: {
    name: "Stripe Secret",
    desc: "Stripe calls this key 'secret'",
    default: "",
    show: only_commercial,
    password: true,
  },
  re_captcha_v3_heading: {
    // this is cosmetic, otherwise it looks weird.
    name: "reCaptcha v3 Keys",
    desc: "You get these from https://www.google.com/recaptcha/intro/v3.html .  They make it so it is more difficult for robots to create accounts on your server.  Users never have to explicitly solve a captcha.",
    default: "",
    show: only_commercial,
    type: "header",
  },
  re_captcha_v3_publishable_key: {
    name: "reCaptcha v3 Site Key",
    desc: "",
    default: "",
    password: false,
    show: only_commercial,
  },
  re_captcha_v3_secret_key: {
    name: "reCaptcha v3 Secret Key",
    desc: "",
    default: "",
    show: only_commercial,
    password: true,
  },
  zendesk_heading: {
    name: "Zendesk API Configuration",
    desc: "",
    default: "",
    type: "header",
  },
  zendesk_token: {
    name: "Zendesk Token",
    desc: "This is the API Token in Zendesk; see their Admin --> API page.",
    default: "",
    password: true,
    show: () => true,
  },
  zendesk_username: {
    name: "Zendesk Username",
    desc: "This is the username for Zendesk.  E.g., for `cocalc.com` it is `support-agent@cocalc.com`",
    default: "",
    show: () => true,
  },
  zendesk_uri: {
    name: "Zendesk Uri",
    desc: "This is the Uri for your Zendesk server.  E.g., for `cocalc.com` it is https://sagemathcloud.zendesk.com/api/v2",
    default: "",
    show: () => true,
  },
  github_heading: {
    name: "GitHub API Configuration",
    desc: "CoCalc can mirror content from  GitHub at `https://yoursite.com/github/[url to github]`. This is just like what https://nbviewer.org does.",
    default: "",
    type: "header",
  },
  github_project_id: {
    name: "GitHub Project ID",
    desc: "If this is set to a `project_id` (a UUID v4 of a project on your server), then the share server will proxy GitHub URL's.  For example, when a user visits https://yoursite.com/github/sagemathinc/cocalc they see a rendered version.  They can star the repo from cocalc, edit it in cocalc, etc.  This extends your CoCalc server to provide similar functionality to what nbviewer.org provides.  Optionally set a GitHub username and personal access token below to massively increase GitHub's API rate limits.",
    default: "",
  },
  github_username: {
    name: "GitHub Username",
    desc: "This is a username for a GitHub Account.",
    default: "",
    show: () => true,
  },
  github_token: {
    name: "GitHub Token",
    desc: "This is a Personal Access token for the above GitHub account.  You can get one at https://github.com/settings/tokens -- you do not have to enable any scopes -- it used only to increase rate limits from 60/hour to 5000/hour.",
    default: "",
    password: true,
    show: () => true,
  },
  openai_section: {
    name: "OpenAI Configuration",
    desc: "",
    default: "",
    show: only_commercial,
    type: "header",
  },
  openai_api_key: {
    name: "OpenAI API Key",
    desc: "Your OpenAI API Key from https://platform.openai.com/account/api-keys.  This key is needed to support functionality that uses OpenAI's API.",
    default: "",
    password: true,
    show: () => true,
  },
  email_section: {
    name: "Email Configuration",
    desc: "",
    default: "",
    type: "header",
  },
  email_backend: {
    name: "Email backend type",
    desc: "The type of backend for sending emails ('none' means there is none).",
    default: "",
    valid: ["none", "sendgrid", "smtp"],
    show: () => true,
  },
  sendgrid_key: {
    name: "Sendgrid API key",
    desc: "You need a Sendgrid account and then enter a valid API key here",
    password: true,
    default: "",
    show: only_for_sendgrid,
  },
  email_smtp_server: {
    name: "SMTP server",
    desc: "the hostname to talk to",
    default: "",
    show: only_for_smtp,
  },
  email_smtp_from: {
    name: "SMTP server FROM",
    desc: "the FROM and REPLYTO email address",
    default: "",
    valid: is_valid_email_address,
    show: only_for_smtp,
  },
  email_smtp_login: {
    name: "SMTP username",
    desc: "the username, for PLAIN login",
    default: "",
    show: only_for_smtp,
  },
  email_smtp_password: {
    name: "SMTP password",
    desc: "the password, for PLAIN login",
    default: "",
    show: only_for_smtp,
    password: true,
  },
  email_smtp_port: {
    name: "SMTP port",
    desc: "Usually: For secure==true use port 465, otherwise port 587 or 25",
    default: "465",
    to_val: to_int,
    valid: only_nonneg_int,
    show: only_for_smtp,
  },
  email_smtp_secure: {
    name: "SMTP secure",
    desc: "Usually 'true'",
    default: "true",
    valid: only_booleans,
    to_val: to_bool,
    show: only_for_smtp,
  },
  // bad name, historic baggage, used in packages/hub/email.ts
  password_reset_override: {
    name: "Override email backend",
    desc: "For 'smtp', password reset and email verification emails are sent via the 'Secondary SMTP' configuration",
    default: "default",
    valid: ["default", "smtp"],
    show: is_email_enabled,
  },
  password_reset_smtp_server: {
    name: "Secondary SMTP server",
    desc: "hostname sending password reset emails",
    default: "",
    show: only_for_password_reset_smtp,
  },
  password_reset_smtp_from: {
    name: "Secondary SMTP FROM",
    desc: "This sets the FROM and REPLYTO email address",
    default: "",
    valid: is_valid_email_address,
    show: only_for_password_reset_smtp,
  },
  password_reset_smtp_login: {
    name: "Secondary SMTP username",
    desc: "username, PLAIN auth",
    default: "",
    show: only_for_password_reset_smtp,
  },
  password_reset_smtp_password: {
    name: "Secondary SMTP password",
    desc: "password, PLAIN auth",
    default: "",
    show: only_for_password_reset_smtp,
    password: true,
  },
  password_reset_smtp_port: {
    name: "Secondary SMTP port",
    desc: "Usually: For secure==true use port 465, otherwise port 587 or 25",
    default: "465",
    to_val: to_int,
    valid: only_nonneg_int,
    show: only_for_password_reset_smtp,
  },
  password_reset_smtp_secure: {
    name: "Secondary SMTP secure",
    desc: "Usually 'true'",
    default: "true",
    valid: only_booleans,
    to_val: to_bool,
    show: only_for_password_reset_smtp,
  },
  prometheus_metrics: {
    name: "Prometheus Metrics",
    desc: "Make [Prometheus metrics](https://prometheus.io/) available at `/metrics`. (Wait one minute after changing this setting for it to take effect.)",
    default: "no",
    valid: only_booleans,
    to_val: to_bool,
  },
} as const;
