export type AuthForm = {
  name: string;
  email: string;
  password: string;
  confirmation: string;
};
export type AuthFields = Record<string, string[]>;
export function validateAuth(
  form: AuthForm,
  register: boolean,
  ar: boolean,
): AuthFields {
  const errors: AuthFields = {};
  const say = (a: string, e: string) => (ar ? a : e);
  const required = (key: string, value: string, message: string) => {
    if (!value.trim()) errors[key] = [message];
  };
  required(
    "email",
    form.email,
    say("أدخل البريد الإلكتروني.", "Enter your email address."),
  );
  if (
    form.email.trim() &&
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())
  ) {
    errors.email = [
      say("أدخل بريدًا إلكترونيًا صحيحًا.", "Enter a valid email address."),
    ];
  }
  if (form.email.trim().length > 255)
    errors.email = [
      say("البريد الإلكتروني طويل جدًا.", "The email address is too long."),
    ];
  required(
    "password",
    form.password,
    say("أدخل كلمة المرور.", "Enter your password."),
  );
  const length = Array.from(form.password).length;
  if (length > 128)
    errors.password = [
      say(
        "كلمة المرور لا تتجاوز 128 حرفًا.",
        "Use no more than 128 password characters.",
      ),
    ];
  if (!register) return errors;
  required(
    "name",
    form.name,
    say("أدخل اسمك الكامل.", "Enter your full name."),
  );
  if (Array.from(form.name.trim()).length > 160)
    errors.name = [
      say(
        "الاسم لا يتجاوز 160 حرفًا.",
        "Use no more than 160 name characters.",
      ),
    ];
  if (length > 0 && length < 8)
    errors.password = [
      say(
        "كلمة المرور تحتاج إلى 8 أحرف على الأقل.",
        "Your password needs at least 8 characters.",
      ),
    ];
  if (!form.confirmation)
    errors.password_confirmation = [
      say(
        "أعد إدخال كلمة المرور لتأكيدها.",
        "Re-enter your password to confirm it.",
      ),
    ];
  else if (form.password !== form.confirmation)
    errors.password_confirmation = [
      say(
        "تأكيد كلمة المرور لا يطابق كلمة المرور.",
        "The password confirmation does not match.",
      ),
    ];
  return errors;
}
export function authFieldMessage(
  field: string,
  message: string,
  ar: boolean,
): string {
  if (field === "email" && /already.*taken|already.*use/i.test(message))
    return ar
      ? "هذا البريد مسجل مسبقًا. سجّل الدخول أو استعد كلمة المرور."
      : "This email is already registered. Sign in or reset your password.";
  if (field === "email" && message === "Invalid credentials.")
    return ar
      ? "البريد الإلكتروني أو كلمة المرور غير صحيحة."
      : "The email or password is incorrect.";
  return message;
}
