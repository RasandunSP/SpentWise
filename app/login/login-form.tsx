"use client";

import { useActionState, useState } from "react";
import { Icon } from "@/components/icon";
import { TextField } from "@/components/text-field";
import { signIn, signUp, type AuthState } from "./actions";
import { PressButton } from "@/components/pressable";

const EMPTY: AuthState = {};

export function LoginForm({
  next,
  initialError,
}: {
  next: string;
  initialError?: string;
}) {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [showPassword, setShowPassword] = useState(false);

  const [signInState, signInAction, signingIn] = useActionState(signIn, EMPTY);
  const [signUpState, signUpAction, signingUp] = useActionState(signUp, EMPTY);

  const isSignUp = mode === "signup";
  const state = isSignUp ? signUpState : signInState;
  const pending = isSignUp ? signingUp : signingIn;
  const error = state.error ?? (state === EMPTY ? initialError : undefined);

  return (
    <form
      action={isSignUp ? signUpAction : signInAction}
      className="flex flex-col gap-7"
    >
      <input type="hidden" name="next" value={next} />

      {isSignUp ? (
        <TextField
          label="Name"
          name="display_name"
          type="text"
          autoComplete="name"
          placeholder="What should we call you?"
          maxLength={60}
        />
      ) : null}

      <TextField
        label="Email"
        name="email"
        type="email"
        inputMode="email"
        autoComplete="email"
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck={false}
        required
        placeholder="you@example.com"
      />

      <div className="relative">
        <TextField
          label="Password"
          name="password"
          type={showPassword ? "text" : "password"}
          autoComplete={isSignUp ? "new-password" : "current-password"}
          required
          minLength={isSignUp ? 8 : undefined}
          placeholder={isSignUp ? "At least 8 characters" : "Your password"}
          className="pr-10"
        />
        <PressButton
          type="button"
          onClick={() => setShowPassword((visible) => !visible)}
          aria-label={showPassword ? "Hide password" : "Show password"}
          className="tap absolute bottom-1.5 right-0 flex h-8 w-8 items-center justify-center
            rounded-full text-ink-faint"
        >
          <Icon name={showPassword ? "visibility_off" : "visibility"} size={19} />
        </PressButton>
      </div>

      {error ? (
        <p role="alert" className="text-meta text-negative">
          {error}
        </p>
      ) : null}

      {state.notice ? (
        <p role="status" className="text-meta text-positive">
          {state.notice}
        </p>
      ) : null}

      <PressButton
        type="submit"
        disabled={pending}
        className="tap mt-1 flex h-14 items-center justify-center gap-2 rounded-full
          bg-ink text-title text-paper disabled:opacity-50"
      >
        {pending ? (
          <>
            <Icon name="progress_activity" size={19} className="animate-spin text-paper" />
            {isSignUp ? "Creating account" : "Signing in"}
          </>
        ) : (
          <>{isSignUp ? "Create account" : "Sign in"}</>
        )}
      </PressButton>

      <p className="text-center text-meta text-ink-faint">
        {isSignUp ? "Already have an account?" : "New to SpentWise?"}{" "}
        <PressButton
          type="button"
          onClick={() => setMode(isSignUp ? "signin" : "signup")}
          className="text-accent"
        >
          {isSignUp ? "Sign in" : "Create one"}
        </PressButton>
      </p>
    </form>
  );
}
