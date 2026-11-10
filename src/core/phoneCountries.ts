export type PhoneCountry = {
  iso: string;
  nameEn: string;
  nameAr: string;
  dialCode: string;
};

export const PHONE_COUNTRIES: PhoneCountry[] = [
  {
    iso: "AE",
    nameEn: "United Arab Emirates",
    nameAr: "الإمارات العربية المتحدة",
    dialCode: "+971",
  },
  { iso: "SA", nameEn: "Saudi Arabia", nameAr: "السعودية", dialCode: "+966" },
  { iso: "OM", nameEn: "Oman", nameAr: "عُمان", dialCode: "+968" },
  { iso: "QA", nameEn: "Qatar", nameAr: "قطر", dialCode: "+974" },
  { iso: "BH", nameEn: "Bahrain", nameAr: "البحرين", dialCode: "+973" },
  { iso: "KW", nameEn: "Kuwait", nameAr: "الكويت", dialCode: "+965" },
  { iso: "EG", nameEn: "Egypt", nameAr: "مصر", dialCode: "+20" },
  { iso: "JO", nameEn: "Jordan", nameAr: "الأردن", dialCode: "+962" },
  { iso: "LB", nameEn: "Lebanon", nameAr: "لبنان", dialCode: "+961" },
  { iso: "IQ", nameEn: "Iraq", nameAr: "العراق", dialCode: "+964" },
  { iso: "IN", nameEn: "India", nameAr: "الهند", dialCode: "+91" },
  { iso: "PK", nameEn: "Pakistan", nameAr: "باكستان", dialCode: "+92" },
  { iso: "BD", nameEn: "Bangladesh", nameAr: "بنغلاديش", dialCode: "+880" },
  { iso: "PH", nameEn: "Philippines", nameAr: "الفلبين", dialCode: "+63" },
  { iso: "TR", nameEn: "Türkiye", nameAr: "تركيا", dialCode: "+90" },
  {
    iso: "GB",
    nameEn: "United Kingdom",
    nameAr: "المملكة المتحدة",
    dialCode: "+44",
  },
  {
    iso: "US",
    nameEn: "United States",
    nameAr: "الولايات المتحدة",
    dialCode: "+1",
  },
  { iso: "CA", nameEn: "Canada", nameAr: "كندا", dialCode: "+1" },
  { iso: "DE", nameEn: "Germany", nameAr: "ألمانيا", dialCode: "+49" },
  { iso: "FR", nameEn: "France", nameAr: "فرنسا", dialCode: "+33" },
  { iso: "IT", nameEn: "Italy", nameAr: "إيطاليا", dialCode: "+39" },
  { iso: "ES", nameEn: "Spain", nameAr: "إسبانيا", dialCode: "+34" },
  { iso: "NL", nameEn: "Netherlands", nameAr: "هولندا", dialCode: "+31" },
  { iso: "AU", nameEn: "Australia", nameAr: "أستراليا", dialCode: "+61" },
  { iso: "CN", nameEn: "China", nameAr: "الصين", dialCode: "+86" },
  { iso: "JP", nameEn: "Japan", nameAr: "اليابان", dialCode: "+81" },
  { iso: "SG", nameEn: "Singapore", nameAr: "سنغافورة", dialCode: "+65" },
  {
    iso: "ZA",
    nameEn: "South Africa",
    nameAr: "جنوب أفريقيا",
    dialCode: "+27",
  },
  { iso: "NG", nameEn: "Nigeria", nameAr: "نيجيريا", dialCode: "+234" },
  { iso: "KE", nameEn: "Kenya", nameAr: "كينيا", dialCode: "+254" },
  { iso: "MA", nameEn: "Morocco", nameAr: "المغرب", dialCode: "+212" },
  { iso: "TN", nameEn: "Tunisia", nameAr: "تونس", dialCode: "+216" },
];

export function phoneCountryFlag(iso: string): string {
  return iso
    .toUpperCase()
    .replace(/[A-Z]/g, (letter) =>
      String.fromCodePoint(127397 + letter.charCodeAt(0)),
    );
}
