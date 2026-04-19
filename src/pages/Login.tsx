import { useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ConfirmationResult } from "firebase/auth";

import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import BrandLogo from "@/components/branding/BrandLogo";
import {
  Lock,
  Loader2,
  Shield,
  UserPlus,
  ArrowLeft,
  KeyRound,
  Smartphone,
} from "lucide-react";

const studentLoginSchema = z.object({
  identifier: z.string().min(3, "Enter mobile number or email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

const otpVerifySchema = z.object({
  otp: z
    .string()
    .min(6, "Enter 6-digit OTP")
    .max(6, "Enter 6-digit OTP")
    .regex(/^\d{6}$/, "OTP must be 6 digits"),
});

const signupSchema = z.object({
  fullName: z.string().min(2, "Enter your full name"),
  phone: z.string().min(10, "Enter a valid mobile number"),
  email: z.union([z.string().email("Enter a valid email"), z.literal("")]),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

const forgotPasswordSchema = z.object({
  otp: z
    .string()
    .min(6, "Enter 6-digit OTP")
    .max(6, "Enter 6-digit OTP")
    .regex(/^\d{6}$/, "OTP must be 6 digits"),
});

type StudentLoginValues = z.infer<typeof studentLoginSchema>;
type OtpVerifyValues = z.infer<typeof otpVerifySchema>;
type SignupValues = z.infer<typeof signupSchema>;
type ForgotPasswordValues = z.infer<typeof forgotPasswordSchema>;

function formatPhoneWith91(raw: string) {
  const digits = raw.replace(/\D/g, "").slice(-10);
  return digits ? `+91${digits}` : "+91";
}

function getTenDigits(raw: string) {
  return raw.replace(/\D/g, "").slice(-10);
}

function OTPInput({
  value,
  onChange,
  onComplete,
  disabled = false,
}: {
  value: string;
  onChange: (val: string) => void;
  onComplete?: (val: string) => void;
  disabled?: boolean;
}) {
  const refs = useRef<Array<HTMLInputElement | null>>([]);
  const [localOtp, setLocalOtp] = useState<string[]>(["", "", "", "", "", ""]);

  useEffect(() => {
    const clean = (value || "").replace(/\D/g, "").slice(0, 6);
    const next = ["", "", "", "", "", ""];
    for (let i = 0; i < clean.length; i++) next[i] = clean[i];
    setLocalOtp(next);
  }, [value]);

  const updateOtp = (next: string[]) => {
    setLocalOtp(next);
    const joined = next.join("");
    onChange(joined);
    if (joined.length === 6 && !next.includes("")) {
      onComplete?.(joined);
    }
  };

  const handleChange = (index: number, raw: string) => {
    if (disabled) return;

    const clean = raw.replace(/\D/g, "");

    if (!clean) {
      const next = [...localOtp];
      next[index] = "";
      updateOtp(next);
      return;
    }

    if (clean.length === 1) {
      const next = [...localOtp];
      next[index] = clean;
      updateOtp(next);

      if (index < 5) {
        refs.current[index + 1]?.focus();
        refs.current[index + 1]?.select();
      }
      return;
    }

    const pasted = clean.slice(0, 6).split("");
    const next = ["", "", "", "", "", ""];
    for (let i = 0; i < pasted.length; i++) next[i] = pasted[i];
    updateOtp(next);

    const focusIndex = Math.min(pasted.length, 5);
    refs.current[focusIndex]?.focus();
    refs.current[focusIndex]?.select();
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (disabled) return;

    if (e.key === "Backspace") {
      e.preventDefault();

      if (localOtp[index]) {
        const next = [...localOtp];
        next[index] = "";
        updateOtp(next);
        return;
      }

      if (index > 0) {
        const next = [...localOtp];
        next[index - 1] = "";
        updateOtp(next);
        refs.current[index - 1]?.focus();
        refs.current[index - 1]?.select();
      }
      return;
    }

    if (e.key === "ArrowLeft" && index > 0) {
      e.preventDefault();
      refs.current[index - 1]?.focus();
      refs.current[index - 1]?.select();
      return;
    }

    if (e.key === "ArrowRight" && index < 5) {
      e.preventDefault();
      refs.current[index + 1]?.focus();
      refs.current[index + 1]?.select();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    if (disabled) return;

    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (!pasted) return;

    const next = ["", "", "", "", "", ""];
    for (let i = 0; i < pasted.length; i++) next[i] = pasted[i];
    updateOtp(next);

    const focusIndex = Math.min(pasted.length, 5);
    refs.current[focusIndex]?.focus();
    refs.current[focusIndex]?.select();
  };

  return (
    <div className="flex justify-between gap-2">
      {localOtp.map((digit, index) => (
        <input
          key={index}
          ref={(el) => {
            refs.current[index] = el;
          }}
          value={digit}
          type="text"
          inputMode="numeric"
          autoComplete={index === 0 ? "one-time-code" : "off"}
          maxLength={1}
          disabled={disabled}
          onChange={(e) => handleChange(index, e.target.value)}
          onKeyDown={(e) => handleKeyDown(index, e)}
          onPaste={handlePaste}
          onFocus={(e) => e.currentTarget.select()}
          className="h-12 w-12 rounded-md border border-input bg-background text-center text-lg font-semibold outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/30 disabled:opacity-50"
        />
      ))}
    </div>
  );
}

export default function Login() {
  const [, setLocation] = useLocation();
  const {
    loginWithEmail,
    loginWithPhone,
    loginAdminWithEmail,
    startStudentSignup,
    completeStudentSignup,
    forgotPassword,
    startForgotPasswordOtp,
    completeForgotPasswordOtp,
  } = useAuth();
  const { toast } = useToast();

  const [studentLoginLoading, setStudentLoginLoading] = useState(false);
  const [studentSignupLoading, setStudentSignupLoading] = useState(false);
  const [studentSignupVerifyLoading, setStudentSignupVerifyLoading] = useState(false);

  const [forgotSendLoading, setForgotSendLoading] = useState(false);
  const [forgotVerifyLoading, setForgotVerifyLoading] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotConfirmationResult, setForgotConfirmationResult] =
    useState<ConfirmationResult | null>(null);
  const [forgotMaskedPhone, setForgotMaskedPhone] = useState("");
  const [forgotIdentifier, setForgotIdentifier] = useState("");

  const [adminLoading, setAdminLoading] = useState(false);
  const [adminForgotLoading, setAdminForgotLoading] = useState(false);
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPassword, setAdminPassword] = useState("");

  const [showSignup, setShowSignup] = useState(false);
  const [showAdmin, setShowAdmin] = useState(false);
  const [signupConfirmationResult, setSignupConfirmationResult] =
    useState<ConfirmationResult | null>(null);

  const studentLoginForm = useForm<StudentLoginValues>({
    resolver: zodResolver(studentLoginSchema),
    defaultValues: { identifier: "", password: "" },
  });

  const signupForm = useForm<SignupValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: { fullName: "", phone: "", email: "", password: "" },
  });

  const signupOtpForm = useForm<OtpVerifyValues>({
    resolver: zodResolver(otpVerifySchema),
    defaultValues: { otp: "" },
  });

  const forgotPasswordForm = useForm<ForgotPasswordValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      otp: "",
    },
  });

  const getErrorMessage = (error: any) => {
    const code = error?.code || "";
    const message = error?.message || "";

    switch (code) {
      case "auth/email-already-in-use":
        return "This email is already registered.";
      case "auth/invalid-email":
        return "Invalid email address.";
      case "auth/weak-password":
        return "Password must be at least 6 characters.";
      case "auth/user-not-found":
        return "Account not found. Register first.";
      case "auth/wrong-password":
        return "Incorrect password.";
      case "auth/invalid-credential":
        return "Invalid credentials. Please try again.";
      case "auth/too-many-requests":
        return "Too many attempts. Please try again later.";
      case "auth/invalid-phone-number":
        return "Invalid mobile number.";
      case "auth/invalid-verification-code":
        return "Invalid OTP.";
      case "auth/code-expired":
        return "OTP expired. Request a new OTP.";
      default:
        return message || "Something went wrong.";
    }
  };

  const resetSignupState = () => {
    setSignupConfirmationResult(null);
    signupOtpForm.reset();
  };

  const resetForgotPasswordState = () => {
    setShowForgotPassword(false);
    setForgotConfirmationResult(null);
    setForgotMaskedPhone("");
    setForgotIdentifier("");
    forgotPasswordForm.reset();
  };

  const handleStudentLogin = async (data: StudentLoginValues) => {
    const rawIdentifier = data.identifier.trim();
    const isEmail = rawIdentifier.includes("@");

    try {
      setStudentLoginLoading(true);

      if (isEmail) {
        await loginWithEmail(rawIdentifier, data.password);
      } else {
        await loginWithPhone(formatPhoneWith91(rawIdentifier), data.password);
      }

      toast({
        title: "Welcome back!",
        description: "Student login successful.",
      });

      setLocation("/dashboard");
    } catch (error: any) {
      toast({
        title: "Login Failed",
        description: getErrorMessage(error),
        variant: "destructive",
      });
    } finally {
      setStudentLoginLoading(false);
    }
  };

  const handleStudentForgotPasswordStart = async () => {
    const identifier = studentLoginForm.getValues("identifier").trim();

    if (!identifier) {
      toast({
        title: "Enter mobile number or email first",
        description: "Type your mobile number or linked email in the login field.",
        variant: "destructive",
      });
      return;
    }

    try {
      setForgotSendLoading(true);

      const result = await startForgotPasswordOtp(identifier, "recaptcha-container");

      setForgotIdentifier(identifier);
      setForgotConfirmationResult(result.confirmation);
      setForgotMaskedPhone(result.maskedPhone);
      forgotPasswordForm.reset();
      setShowForgotPassword(true);

      toast({
        title: "OTP Sent",
        description: `Password reset OTP sent to ${result.maskedPhone}`,
      });
    } catch (error: any) {
      toast({
        title: "Reset Failed",
        description: getErrorMessage(error),
        variant: "destructive",
      });
    } finally {
      setForgotSendLoading(false);
    }
  };

  const handleStudentForgotPasswordVerify = async (data: ForgotPasswordValues) => {
    if (!forgotConfirmationResult) {
      toast({
        title: "OTP session missing",
        description: "Please request OTP again.",
        variant: "destructive",
      });
      return;
    }

    try {
      setForgotVerifyLoading(true);

      await completeForgotPasswordOtp(
        forgotConfirmationResult,
        data.otp,
        ""
      );

      toast({
        title: "OTP verified",
        description: "Set a new password for security reasons.",
      });

      studentLoginForm.setValue("password", "");
      resetForgotPasswordState();
      setLocation("/profile");
    } catch (error: any) {
      toast({
        title: "Reset Failed",
        description: getErrorMessage(error),
        variant: "destructive",
      });
    } finally {
      setForgotVerifyLoading(false);
    }
  };

  const handleSignupSendOtp = async (data: SignupValues) => {
    try {
      setStudentSignupLoading(true);

      const confirmation = await startStudentSignup(
        data.fullName,
        formatPhoneWith91(data.phone),
        data.password,
        data.email || undefined,
        "recaptcha-container"
      );

      setSignupConfirmationResult(confirmation);
      signupOtpForm.reset();

      toast({
        title: "OTP Sent",
        description: "Verify OTP to create your account.",
      });
    } catch (error: any) {
      toast({
        title: "Signup Failed",
        description: getErrorMessage(error),
        variant: "destructive",
      });
    } finally {
      setStudentSignupLoading(false);
    }
  };

  const handleSignupVerifyOtp = async (data: OtpVerifyValues) => {
    if (!signupConfirmationResult) {
      toast({
        title: "OTP session missing",
        description: "Please send OTP again.",
        variant: "destructive",
      });
      return;
    }

    try {
      setStudentSignupVerifyLoading(true);
      await completeStudentSignup(signupConfirmationResult, data.otp);

      toast({
        title: "Account Created!",
        description: "Student account created successfully.",
      });

      resetSignupState();
      signupForm.reset();
      setShowSignup(false);
      setLocation("/dashboard");
    } catch (error: any) {
      toast({
        title: "Signup Verification Failed",
        description: getErrorMessage(error),
        variant: "destructive",
      });
    } finally {
      setStudentSignupVerifyLoading(false);
    }
  };

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!adminEmail.trim() || !adminPassword.trim()) {
      toast({
        title: "Missing details",
        description: "Please enter admin email and password.",
        variant: "destructive",
      });
      return;
    }

    try {
      setAdminLoading(true);
      await loginAdminWithEmail(adminEmail.trim(), adminPassword);

      toast({
        title: "Admin Access Granted",
        description: "Welcome to admin panel.",
      });

      setLocation("/admin");
    } catch (error: any) {
      toast({
        title: "Admin Login Failed",
        description: getErrorMessage(error),
        variant: "destructive",
      });
    } finally {
      setAdminLoading(false);
    }
  };

  const handleAdminForgotPassword = async () => {
    if (!adminEmail.trim()) {
      toast({
        title: "Enter admin email first",
        description: "Type your admin email in the admin login form.",
        variant: "destructive",
      });
      return;
    }

    try {
      setAdminForgotLoading(true);
      await forgotPassword(adminEmail.trim());

      toast({
        title: "Reset link sent",
        description: "Please check the admin email inbox.",
      });
    } catch (error: any) {
      toast({
        title: "Reset Failed",
        description: getErrorMessage(error),
        variant: "destructive",
      });
    } finally {
      setAdminForgotLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-secondary via-secondary/90 to-primary/20 flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md relative">
        <button
          onClick={() => setShowAdmin(true)}
          className="absolute -top-2 right-0 z-10 w-11 h-11 rounded-full bg-card/90 border shadow-lg flex items-center justify-center hover:scale-105 transition"
        >
          <Shield className="w-5 h-5 text-primary" />
        </button>

        <div className="text-center mb-8">
          <div className="flex flex-col items-center">
            <BrandLogo tone="light" size="xl" className="mb-4" />
            <h1 className="text-3xl font-bold font-serif text-white tracking-tight">
              CUPHY
            </h1>
            <p className="text-white/60 mt-1 text-sm">Physics Made Powerful</p>
          </div>
        </div>

        {!showAdmin ? (
          <Card className="shadow-2xl border-0 bg-card/95 backdrop-blur">
            <CardHeader className="pb-3">
              <CardTitle className="text-xl">Student Login</CardTitle>
              <CardDescription>
                Sign in with mobile number or linked email
              </CardDescription>
            </CardHeader>

            <CardContent>
              <Form {...studentLoginForm}>
                <form className="space-y-4">
                  <FormField
                    control={studentLoginForm.control}
                    name="identifier"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Mobile Number or Email</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            placeholder="9876543210 or student@email.com"
                            autoComplete="username"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={studentLoginForm.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Password</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            placeholder="••••••••"
                            type="password"
                            autoComplete="current-password"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button
                    type="button"
                    className="w-full gap-2"
                    disabled={studentLoginLoading || forgotSendLoading}
                    onClick={studentLoginForm.handleSubmit(handleStudentLogin)}
                  >
                    {studentLoginLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Lock className="w-4 h-4" />
                    )}
                    Student Sign In
                  </Button>

                  <Button
                    type="button"
                    variant="ghost"
                    className="w-full text-sm"
                    disabled={forgotSendLoading}
                    onClick={handleStudentForgotPasswordStart}
                  >
                    {forgotSendLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    ) : (
                      <Smartphone className="w-4 h-4 mr-2" />
                    )}
                    Forgot Password?
                  </Button>

                  <div className="text-center pt-2 border-t">
                    <button
                      type="button"
                      onClick={() => setShowSignup(true)}
                      className="text-sm text-primary font-medium hover:underline"
                    >
                      Create Account
                    </button>
                  </div>
                </form>
              </Form>

              <div id="recaptcha-container" className="mt-4" />
            </CardContent>
          </Card>
        ) : (
          <Card className="shadow-2xl border-0 bg-card/95 backdrop-blur">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2 mb-2">
                <button
                  onClick={() => setShowAdmin(false)}
                  className="w-9 h-9 rounded-full border flex items-center justify-center hover:bg-muted transition"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <div>
                  <CardTitle className="text-xl">Admin Login</CardTitle>
                  <CardDescription>Authorized admin access only</CardDescription>
                </div>
              </div>
            </CardHeader>

            <CardContent>
              <form onSubmit={handleAdminLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="admin-email">Admin Email</Label>
                  <Input
                    id="admin-email"
                    value={adminEmail}
                    onChange={(e) => setAdminEmail(e.target.value)}
                    placeholder="admin@email.com"
                    type="email"
                    autoComplete="username"
                    disabled={adminLoading}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="admin-password">Admin Password</Label>
                  <Input
                    id="admin-password"
                    value={adminPassword}
                    onChange={(e) => setAdminPassword(e.target.value)}
                    placeholder="••••••••"
                    type="password"
                    autoComplete="current-password"
                    disabled={adminLoading}
                  />
                </div>

                <Button type="submit" className="w-full gap-2" disabled={adminLoading}>
                  {adminLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Shield className="w-4 h-4" />
                  )}
                  Admin Login
                </Button>

                <Button
                  type="button"
                  variant="ghost"
                  className="w-full text-sm"
                  disabled={adminForgotLoading}
                  onClick={handleAdminForgotPassword}
                >
                  {adminForgotLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : null}
                  Forgot Password?
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        {showSignup && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center px-4 z-50">
            <div className="w-full max-w-md">
              <Card className="shadow-2xl border-0 bg-card">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2 mb-2">
                    <button
                      onClick={() => {
                        setShowSignup(false);
                        resetSignupState();
                      }}
                      className="w-9 h-9 rounded-full border flex items-center justify-center hover:bg-muted transition"
                    >
                      <ArrowLeft className="w-4 h-4" />
                    </button>
                    <div>
                      <CardTitle className="text-xl">Create Account</CardTitle>
                      <CardDescription>
                        {!signupConfirmationResult
                          ? "Create with mobile number"
                          : "Verify OTP to finish account creation"}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>

                <CardContent>
                  {!signupConfirmationResult ? (
                    <Form {...signupForm}>
                      <form className="space-y-4">
                        <FormField
                          control={signupForm.control}
                          name="fullName"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Full Name</FormLabel>
                              <FormControl>
                                <Input {...field} placeholder="Your full name" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={signupForm.control}
                          name="phone"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Mobile Number</FormLabel>
                              <FormControl>
                                <div className="flex">
                                  <div className="px-3 flex items-center border border-r-0 rounded-l-md bg-muted text-sm">
                                    +91
                                  </div>
                                  <Input
                                    value={getTenDigits(field.value)}
                                    onChange={(e) => field.onChange(e.target.value)}
                                    placeholder="9876543210"
                                    className="rounded-l-none"
                                    inputMode="numeric"
                                    autoComplete="tel"
                                  />
                                </div>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={signupForm.control}
                          name="email"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Email (Optional)</FormLabel>
                              <FormControl>
                                <Input {...field} placeholder="student@email.com" type="email" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={signupForm.control}
                          name="password"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Password</FormLabel>
                              <FormControl>
                                <Input {...field} placeholder="••••••••" type="password" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <Button
                          type="button"
                          className="w-full gap-2"
                          disabled={studentSignupLoading}
                          onClick={signupForm.handleSubmit(handleSignupSendOtp)}
                        >
                          {studentSignupLoading ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <UserPlus className="w-4 h-4" />
                          )}
                          Send OTP to Create Account
                        </Button>
                      </form>
                    </Form>
                  ) : (
                    <Form {...signupOtpForm}>
                      <form className="space-y-4">
                        <FormField
                          control={signupOtpForm.control}
                          name="otp"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Enter OTP</FormLabel>
                              <FormControl>
                                <OTPInput
                                  value={field.value}
                                  onChange={(val) => field.onChange(val)}
                                  onComplete={(val) => {
                                    signupOtpForm.setValue("otp", val, {
                                      shouldValidate: true,
                                      shouldDirty: true,
                                      shouldTouch: true,
                                    });
                                    signupOtpForm.clearErrors("otp");
                                  }}
                                  disabled={studentSignupVerifyLoading}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <Button
                          type="button"
                          className="w-full gap-2"
                          disabled={studentSignupVerifyLoading}
                          onClick={signupOtpForm.handleSubmit(handleSignupVerifyOtp)}
                        >
                          {studentSignupVerifyLoading ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <KeyRound className="w-4 h-4" />
                          )}
                          Verify OTP & Create Account
                        </Button>

                        <Button
                          type="button"
                          variant="outline"
                          className="w-full"
                          onClick={resetSignupState}
                        >
                          Change Number / Details
                        </Button>
                      </form>
                    </Form>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {showForgotPassword && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center px-4 z-50">
            <div className="w-full max-w-md">
              <Card className="shadow-2xl border-0 bg-card">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2 mb-2">
                    <button
                      onClick={resetForgotPasswordState}
                      className="w-9 h-9 rounded-full border flex items-center justify-center hover:bg-muted transition"
                    >
                      <ArrowLeft className="w-4 h-4" />
                    </button>
                    <div>
                      <CardTitle className="text-xl">Reset Password</CardTitle>
                      <CardDescription>
                        OTP sent to linked phone {forgotMaskedPhone ? `(${forgotMaskedPhone})` : ""}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>

                <CardContent>
                  <Form {...forgotPasswordForm}>
                    <form className="space-y-4">
                      <div className="rounded-lg border bg-muted/40 px-3 py-2 text-sm">
                        <div className="font-medium">Account Identifier</div>
                        <div className="text-muted-foreground break-all">{forgotIdentifier}</div>
                      </div>

                      <FormField
                        control={forgotPasswordForm.control}
                        name="otp"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Enter OTP</FormLabel>
                            <FormControl>
                              <OTPInput
                                value={field.value}
                                onChange={(val) => field.onChange(val)}
                                onComplete={(val) => {
                                  forgotPasswordForm.setValue("otp", val, {
                                    shouldValidate: true,
                                    shouldDirty: true,
                                    shouldTouch: true,
                                  });
                                  forgotPasswordForm.clearErrors("otp");
                                }}
                                disabled={forgotVerifyLoading}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <Button
                        type="button"
                        className="w-full gap-2"
                        disabled={forgotVerifyLoading}
                        onClick={forgotPasswordForm.handleSubmit(
                          handleStudentForgotPasswordVerify
                        )}
                      >
                        {forgotVerifyLoading ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <KeyRound className="w-4 h-4" />
                        )}
                        Verify OTP & Continue
                      </Button>

                      <Button
                        type="button"
                        variant="outline"
                        className="w-full"
                        disabled={forgotSendLoading}
                        onClick={handleStudentForgotPasswordStart}
                      >
                        {forgotSendLoading ? (
                          <Loader2 className="w-4 h-4 animate-spin mr-2" />
                        ) : null}
                        Resend OTP
                      </Button>
                    </form>
                  </Form>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}