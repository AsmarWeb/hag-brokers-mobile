import { PHONE_COUNTRIES } from "./phoneCountries";

export type AuthForm = {
  name: string;
  email: string;
  password: string;
  confirmation: string;
  company: boolean;
  business: string;
  phone: string;
  phoneCountryCode: string;
  country: string;
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
  )
    errors.email = [
      say(
        "أدخل بريدًا إلكترونيًا صحيحًا، مثل name@company.com.",
        "Enter a valid email, such as name@company.com.",
      ),
    ];
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
  if (length > 0 && length < 12)
    errors.password = [
      say(
        "كلمة المرور تحتاج إلى 12 حرفًا على الأقل.",
        "Your password needs at least 12 characters.",
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
  required(
    "phone",
    form.phone,
    say(
      "أدخل رقم الهاتف المحلي دون مفتاح الدولة.",
      "Enter your local phone number without the country calling code.",
    ),
  );

  const phoneDigits = form.phone.replace(/\D/g, "");
  if (
    form.phone.trim() &&
    (phoneDigits.length < 7 ||
      phoneDigits.length > 15 ||
      /^0+$/.test(phoneDigits))
  ) {
    errors.phone = [
      say(
        "أدخل رقمًا صحيحًا من 7 إلى 15 رقمًا.",
        "Enter a valid phone number containing 7 to 15 digits.",
      ),
    ];
  }

  if (form.phone.trim().length > 50) {
    errors.phone = [
      say("رقم الهاتف طويل جدًا.", "The phone number is too long."),
    ];
  }

  if (!PHONE_COUNTRIES.some((item) => item.iso === form.phoneCountryCode)) {
    errors.phone_country_code = [
      say("اختر دولة صحيحة لمفتاح الهاتف.", "Choose a valid phone country."),
    ];
  }

  if (form.company) {
    required(
      "company_name",
      form.business,
      say("أدخل اسم الشركة.", "Enter your company name."),
    );
    if (Array.from(form.business.trim()).length > 255)
      errors.company_name = [
        say(
          "اسم الشركة لا يتجاوز 255 حرفًا.",
          "Use no more than 255 characters for the company name.",
        ),
      ];
    if (!/^[a-z]{2}$/i.test(form.country.trim()))
      errors.country_code = [
        say(
          "استخدم رمز دولة من حرفين بالإنجليزية، مثل AE للإمارات.",
          "Use a two-letter country code, such as AE for the UAE.",
        ),
      ];
  }
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
