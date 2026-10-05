"use client";

import { type FormEvent, useActionState, useTransition } from "react";

/**
 * Like `useActionState`, but submits through `onSubmit` instead of `<form action>`.
 * React resets a form after every `action` submission – including one that failed
 * validation – which wipes what the user typed. This keeps their input.
 */
export function useFormAction<S>(
  action: (state: Awaited<S>, formData: FormData) => S | Promise<S>,
  initial: Awaited<S>,
) {
  const [state, dispatch, actionPending] = useActionState(action, initial);
  const [transitionPending, start] = useTransition();
  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget, (e.nativeEvent as SubmitEvent).submitter);
    start(() => dispatch(formData));
  };
  return [state, onSubmit, actionPending || transitionPending] as const;
}
