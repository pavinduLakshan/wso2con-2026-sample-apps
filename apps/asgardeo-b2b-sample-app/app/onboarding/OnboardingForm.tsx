"use client";

import { FormEvent, useState } from "react";
import { useAsgardeo } from "@asgardeo/nextjs";

type OnboardingResponse = {
  organization: {
    id: string;
    name: string;
    orgHandle: string;
  };
  user: {
    id: string;
    userName: string;
  };
};

type FormState = {
  email: string;
  familyName: string;
  givenName: string;
  organizationName: string;
};

const ONBOARDING_ERROR_MESSAGE = "We couldn't create your organization right now. Please try again in a moment.";

const initialForm: FormState = {
  email: "",
  familyName: "",
  givenName: "",
  organizationName: ""
};

export default function OnboardingForm() {
  const { isSignedIn, signIn, switchOrganization } = useAsgardeo();
  const [form, setForm] = useState<FormState>(initialForm);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  function updateField(field: keyof FormState, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setStatus("Creating your organization workspace...");
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/onboarding", {
        body: JSON.stringify(form),
        headers: {
          "Content-Type": "application/json"
        },
        method: "POST"
      });
      const body = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(ONBOARDING_ERROR_MESSAGE);
      }

      const result = body as OnboardingResponse;
      setStatus("Organization and user are ready. Switching workspace...");

      if (isSignedIn && switchOrganization) {
        await switchOrganization(result.organization);
        window.location.assign("/dashboard");

        return;
      }

      if (typeof signIn !== "function") {
        throw new Error(ONBOARDING_ERROR_MESSAGE);
      }

      setStatus("Organization and user are ready. Redirecting to your workspace...");
      await signIn();
    } catch {
      setError(ONBOARDING_ERROR_MESSAGE);
      setStatus("");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="onboarding-form" onSubmit={handleSubmit}>
      <div className="form-grid">
        <label>
          First name
          <input
            autoComplete="given-name"
            onChange={(event) => updateField("givenName", event.target.value)}
            required
            value={form.givenName}
          />
        </label>
        <label>
          Last name
          <input
            autoComplete="family-name"
            onChange={(event) => updateField("familyName", event.target.value)}
            required
            value={form.familyName}
          />
        </label>
      </div>
      <label>
        Work email
        <input
          autoComplete="email"
          onChange={(event) => updateField("email", event.target.value)}
          required
          type="email"
          value={form.email}
        />
      </label>
      <label>
        Organization name
        <input
          autoComplete="organization"
          onChange={(event) => updateField("organizationName", event.target.value)}
          required
          value={form.organizationName}
        />
      </label>
      <button className="button button-primary" disabled={isSubmitting} type="submit">
        {isSubmitting ? "Provisioning..." : "Create organization"}
      </button>
      {status ? <p className="form-status">{status}</p> : null}
      {error ? <p className="form-error">{error}</p> : null}
    </form>
  );
}
