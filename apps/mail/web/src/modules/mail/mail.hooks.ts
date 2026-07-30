import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createMailMessage,
  getMailSettings,
  getMailSummary,
  listMail,
  restoreMail,
  saveMailSettings,
  syncMail,
  testMail,
  trashMail
} from "./mail.services";
import type { Mailbox } from "./mail.types";

export const mailQueryKey = ["mail"] as const;

export function useMailWorkspace(mailbox: Mailbox, search: string) {
  const client = useQueryClient();
  const invalidate = () => client.invalidateQueries({ queryKey: mailQueryKey });
  return {
    messages: useQuery({
      queryKey: [...mailQueryKey, "messages", mailbox, search],
      queryFn: () => listMail(mailbox, search)
    }),
    settings: useQuery({ queryKey: [...mailQueryKey, "settings"], queryFn: getMailSettings }),
    summary: useQuery({ queryKey: [...mailQueryKey, "summary"], queryFn: getMailSummary }),
    compose: useMutation({ mutationFn: createMailMessage, onSuccess: invalidate }),
    saveSettings: useMutation({ mutationFn: saveMailSettings, onSuccess: invalidate }),
    test: useMutation({ mutationFn: testMail, onSuccess: invalidate }),
    sync: useMutation({ mutationFn: syncMail, onSuccess: invalidate }),
    trash: useMutation({ mutationFn: trashMail, onSuccess: invalidate }),
    restore: useMutation({ mutationFn: restoreMail, onSuccess: invalidate })
  };
}
