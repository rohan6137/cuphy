import { useState } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from "@/contexts/AuthContext";
import { useRequestOtp, useVerifyOtp, useLoginWithPassword } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { BookOpen, Phone, Lock, ArrowRight, Loader2 } from "lucide-react";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";

const otpRequestSchema = z.object({ phone: z.string().min(10, "Enter valid phone number") });
const otpVerifySchema = z.object({ phone: z.string().min(10), otp: z.string().length(6, "OTP must be 6 digits") });
const passwordSchema = z.object({ phone: z.string().min(10, "Enter valid phone"), password: z.string().min(4, "Enter password") });

export default function Login() {
  const [, setLocation] = useLocation();
  const { login } = useAuth();
  const { toast } = useToast();
  const [otpSent, setOtpSent] = useState(false);
  const [otpPhone, setOtpPhone] = useState("");

  const requestOtp = useRequestOtp();
  const verifyOtp = useVerifyOtp();
  const loginPassword = useLoginWithPassword();

  const otpRequestForm = useForm({ resolver: zodResolver(otpRequestSchema), defaultValues: { phone: "" } });
  const otpVerifyForm = useForm({ resolver: zodResolver(otpVerifySchema), defaultValues: { phone: "", otp: "" } });
  const passwordForm = useForm({ resolver: zodResolver(passwordSchema), defaultValues: { phone: "", password: "" } });

  const handleRequestOtp = async (data: { phone: string }) => {
    requestOtp.mutate({ data: { phone: data.phone } }, {
      onSuccess: (res: any) => {
        setOtpPhone(data.phone);
        otpVerifyForm.setValue("phone", data.phone);
        setOtpSent(true);
        toast({ title: "OTP Sent", description: res.message || "Check your phone" });
      },
      onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
    });
  };

  const handleVerifyOtp = async (data: { phone: string; otp: string }) => {
    verifyOtp.mutate({ data }, {
      onSuccess: (res: any) => {
        login(res.user, res.token);
        toast({ title: "Welcome!", description: `Hello ${res.user.name}` });
        setLocation(res.user.role === "admin" ? "/admin" : "/dashboard");
      },
      onError: (err: any) => toast({ title: "Invalid OTP", description: err.message, variant: "destructive" }),
    });
  };

  const handlePasswordLogin = async (data: { phone: string; password: string }) => {
    loginPassword.mutate({ data }, {
      onSuccess: (res: any) => {
        login(res.user, res.token);
        toast({ title: "Welcome back!", description: `Hello ${res.user.name}` });
        setLocation(res.user.role === "admin" ? "/admin" : "/dashboard");
      },
      onError: (err: any) => toast({ title: "Login Failed", description: err.message, variant: "destructive" }),
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-secondary via-secondary/90 to-primary/20 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center mx-auto mb-4 shadow-lg shadow-primary/30">
            <BookOpen className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold font-serif text-white">CUPHY</h1>
          <p className="text-white/60 mt-1 text-sm">Physics Made Powerful</p>
        </div>

        <Card className="shadow-2xl border-0 bg-card/95 backdrop-blur">
          <CardHeader className="pb-3">
            <CardTitle className="text-xl">Welcome back</CardTitle>
            <CardDescription>Sign in to access your courses and materials</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="otp">
              <TabsList className="w-full mb-6">
                <TabsTrigger value="otp" className="flex-1 gap-2">
                  <Phone className="w-3.5 h-3.5" /> OTP Login
                </TabsTrigger>
                <TabsTrigger value="password" className="flex-1 gap-2">
                  <Lock className="w-3.5 h-3.5" /> Password Login
                </TabsTrigger>
              </TabsList>

              <TabsContent value="otp">
                {!otpSent ? (
                  <Form {...otpRequestForm}>
                    <form onSubmit={otpRequestForm.handleSubmit(handleRequestOtp)} className="space-y-4">
                      <FormField
                        control={otpRequestForm.control}
                        name="phone"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Phone Number</FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                placeholder="9876543210"
                                type="tel"
                                maxLength={10}
                                data-testid="input-phone-otp"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <Button
                        type="submit"
                        className="w-full gap-2"
                        disabled={requestOtp.isPending}
                        data-testid="button-send-otp"
                      >
                        {requestOtp.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
                        Send OTP
                      </Button>
                    </form>
                  </Form>
                ) : (
                  <Form {...otpVerifyForm}>
                    <form onSubmit={otpVerifyForm.handleSubmit(handleVerifyOtp)} className="space-y-4">
                      <p className="text-sm text-muted-foreground">OTP sent to <strong>{otpPhone}</strong></p>
                      <FormField
                        control={otpVerifyForm.control}
                        name="otp"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Enter 6-digit OTP</FormLabel>
                            <FormControl>
                              <InputOTP maxLength={6} {...field} data-testid="input-otp">
                                <InputOTPGroup>
                                  {[0,1,2,3,4,5].map(i => (
                                    <InputOTPSlot key={i} index={i} />
                                  ))}
                                </InputOTPGroup>
                              </InputOTP>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <div className="flex gap-2">
                        <Button type="button" variant="ghost" size="sm" onClick={() => setOtpSent(false)}>
                          Change Number
                        </Button>
                        <Button
                          type="submit"
                          className="flex-1 gap-2"
                          disabled={verifyOtp.isPending}
                          data-testid="button-verify-otp"
                        >
                          {verifyOtp.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                          Verify & Login
                        </Button>
                      </div>
                    </form>
                  </Form>
                )}
              </TabsContent>

              <TabsContent value="password">
                <Form {...passwordForm}>
                  <form onSubmit={passwordForm.handleSubmit(handlePasswordLogin)} className="space-y-4">
                    <FormField
                      control={passwordForm.control}
                      name="phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Phone Number</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="9876543210" type="tel" maxLength={10} data-testid="input-phone-password" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={passwordForm.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Password</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="••••••••" type="password" data-testid="input-password" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button
                      type="submit"
                      className="w-full gap-2"
                      disabled={loginPassword.isPending}
                      data-testid="button-login-password"
                    >
                      {loginPassword.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                      Sign In
                    </Button>
                    <p className="text-xs text-center text-muted-foreground">
                      Admin: 9999999999 / admin123 | Student: 9876543210 / student123
                    </p>
                  </form>
                </Form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
