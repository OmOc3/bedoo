"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { updateClientProfileAction } from "@/app/actions/client-orders";
import { createUserAccountAction, type UserActionResult } from "@/app/actions/users";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/text-field";
import { clientAddressLinesFromText } from "@/lib/validation/client-orders";
import { createUserSchema } from "@/lib/validation/users";

interface CreateClientAccountValues {
  addressesText: string;
  displayName: string;
  email: string;
  password: string;
  phone: string;
}

const accessCodeAlphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const createClientAccountSchema = createUserSchema
  .pick({ displayName: true, email: true, password: true })
  .extend({
    addressesText: z.string().trim().max(1200),
    phone: z
      .string()
      .trim()
      .max(40, "رقم الهاتف طويل جدًا.")
      .regex(/^[0-9+\s().-]*$/, "رقم الهاتف يجب أن يحتوي على أرقام ورموز اتصال فقط."),
  })
  .superRefine((values, context) => {
    const addresses = clientAddressLinesFromText(values.addressesText);

    if (addresses.length > 8) {
      context.addIssue({
        code: "custom",
        message: "لا يمكن إضافة أكثر من 8 عناوين للعميل.",
        path: ["addressesText"],
      });
    }

    addresses.forEach((address, index) => {
      if (address.length < 3 || address.length > 180) {
        context.addIssue({
          code: "custom",
          message: `العنوان رقم ${index + 1} يجب أن يكون بين 3 و180 حرفًا.`,
          path: ["addressesText"],
        });
      }
    });
  });

function generateAccessCode(length = 10): string {
  const values = new Uint32Array(length);
  crypto.getRandomValues(values);
  return Array.from(values, (value) => accessCodeAlphabet[value % accessCodeAlphabet.length]).join("");
}

function toFormData(values: CreateClientAccountValues): FormData {
  const formData = new FormData();
  formData.set("displayName", values.displayName);
  formData.set("email", values.email);
  formData.set("password", values.password);
  formData.set("role", "client");
  return formData;
}

function toClientProfileFormData(clientUid: string, values: CreateClientAccountValues): FormData {
  const formData = new FormData();
  formData.set("addressesText", values.addressesText);
  formData.set("clientUid", clientUid);
  formData.set("phone", values.phone);
  return formData;
}

function hasProfileValues(values: CreateClientAccountValues): boolean {
  return values.phone.trim().length > 0 || clientAddressLinesFromText(values.addressesText).length > 0;
}

function getFieldError(result: UserActionResult | null, fieldName: keyof CreateClientAccountValues): string | undefined {
  return result?.fieldErrors?.[fieldName]?.[0];
}

export function CreateClientAccountForm() {
  const [result, setResult] = useState<UserActionResult | null>(null);
  const form = useForm<CreateClientAccountValues>({
    resolver: zodResolver(createClientAccountSchema),
    defaultValues: {
      addressesText: "",
      displayName: "",
      email: "",
      password: "",
      phone: "",
    },
  });

  async function onSubmit(values: CreateClientAccountValues): Promise<void> {
    setResult(null);
    const actionResult = await createUserAccountAction(toFormData(values));

    if (actionResult.success && actionResult.createdUid && hasProfileValues(values)) {
      const profileResult = await updateClientProfileAction(toClientProfileFormData(actionResult.createdUid, values));

      if (profileResult.error) {
        setResult({ error: `تم إنشاء العميل، لكن تعذر حفظ بيانات التواصل: ${profileResult.error}` });
        return;
      }
    }

    setResult(actionResult);

    if (actionResult.success) {
      form.reset({
        addressesText: "",
        displayName: "",
        email: "",
        password: "",
        phone: "",
      });
    }
  }

  return (
    <form className="grid gap-4 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-card sm:grid-cols-2" dir="rtl" onSubmit={form.handleSubmit(onSubmit)}>
      <div className="sm:col-span-2">
        <h2 className="text-lg font-bold text-[var(--foreground)]">إضافة عميل جديد</h2>
        <p className="mt-1 text-sm text-[var(--muted)]">يتم إنشاء الحساب بدور عميل بشكل مباشر وجاهز لتسجيل الدخول.</p>
      </div>

      {result?.error ? (
        <p className="rounded-lg border border-[var(--danger-muted)] bg-[var(--danger-soft)] px-4 py-3 text-sm font-medium text-[var(--danger)] sm:col-span-2">
          {result.error}
        </p>
      ) : null}
      {result?.success ? (
        <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700 sm:col-span-2">
          تم إنشاء العميل بنجاح.
        </p>
      ) : null}

      <TextField
        autoComplete="name"
        error={form.formState.errors.displayName?.message ?? getFieldError(result, "displayName")}
        id="clientDisplayName"
        label="اسم العميل"
        placeholder="مثال: شركة الندى"
        {...form.register("displayName")}
      />

      <TextField
        autoComplete="email"
        error={form.formState.errors.email?.message ?? getFieldError(result, "email")}
        id="clientEmail"
        label="بريد العميل"
        placeholder="client@company.com"
        type="email"
        {...form.register("email")}
      />

      <TextField
        autoComplete="tel"
        error={form.formState.errors.phone?.message}
        id="clientPhone"
        label="رقم الهاتف"
        placeholder="+20 10 0000 0000"
        type="tel"
        {...form.register("phone")}
      />

      <div className="space-y-2 sm:col-span-2">
        <TextField
          autoComplete="off"
          error={form.formState.errors.password?.message ?? getFieldError(result, "password")}
          id="clientPassword"
          label="كود دخول العميل"
          placeholder="مثال: A7K9P2M4"
          {...form.register("password")}
        />
        <Button
          className="w-full sm:w-auto"
          onClick={() => form.setValue("password", generateAccessCode(), { shouldDirty: true, shouldValidate: true })}
          type="button"
          variant="secondary"
        >
          توليد كود
        </Button>
      </div>

      <div className="space-y-2 sm:col-span-2">
        <label className="text-sm font-semibold text-[var(--foreground)]" htmlFor="clientAddressesText">
          عناوين العميل
        </label>
        <textarea
          className="min-h-28 w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm leading-6 text-[var(--foreground)] shadow-control placeholder:text-[var(--muted)] focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
          id="clientAddressesText"
          placeholder={"كل عنوان في سطر مستقل\nمثال: القاهرة - التجمع - مبنى الإدارة"}
          {...form.register("addressesText")}
        />
        {form.formState.errors.addressesText?.message ? (
          <p className="text-xs text-[var(--danger)]">{form.formState.errors.addressesText.message}</p>
        ) : null}
      </div>

      <div className="sm:col-span-2">
        <Button className="sm:w-auto" disabled={form.formState.isSubmitting} isLoading={form.formState.isSubmitting} type="submit">
          إنشاء عميل
        </Button>
      </div>
    </form>
  );
}
