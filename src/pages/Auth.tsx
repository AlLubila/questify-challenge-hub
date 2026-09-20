import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Mail, Chrome, ArrowLeft, KeyRound, Loader2, Flag } from "lucide-react";
import { z } from "zod";
import { Navigate, useLocation, useSearchParams } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import { AChallengeLogo } from "@/components/AChallengeLogo";

const emailSchema = z.string().trim().email("Invalid email address");
const passwordSchema = z.string().min(6, "Password must be at least 6 characters");
const usernameSchema = z.string().trim().min(3, "Username must be at least 3 characters").max(20, "Username must be less than 20 characters");
type AuthView = "login" | "signup" | "otp" | "forgot" | "reset";

const Auth = () => {
  const { user, isLoading } = useAuth();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [referralCode, setReferralCode] = useState<string | null>(null);
  const isRecoveryLink = searchParams.get("mode") === "reset" ||
    searchParams.get("type") === "recovery" ||
    window.location.hash.includes("type=recovery");
  const [authView, setAuthView] = useState<AuthView>(isRecoveryLink ? "reset" : "login");
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const { t } = useLanguage();

  // Login form state
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  // Signup form state
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [signupUsername, setSignupUsername] = useState("");
  const [signupDisplayName, setSignupDisplayName] = useState("");
  const [recoveryEmail, setRecoveryEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [pendingEmail, setPendingEmail] = useState("");
  const [otpType, setOtpType] = useState<"email" | "signup">("email");

  // Check for referral code in URL
  useEffect(() => {
    const refCode = searchParams.get("ref");
    if (refCode) {
      setReferralCode(refCode);
      toast.success("Referral code applied! Sign up to get your bonus.");
    }
  }, [searchParams]);

  // Redirect if already logged in
  if (user && !isLoading && authView !== "reset") {
    const requestedPath = (location.state as { from?: { pathname?: string; search?: string } } | null)?.from;
    const destination = requestedPath?.pathname
      ? `${requestedPath.pathname}${requestedPath.search ?? ""}`
      : "/";
    return <Navigate to={destination} replace />;
  }

  const handleRecoveryRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatusMessage(null);
    setIsSubmitting(true);

    try {
      const email = emailSchema.parse(recoveryEmail);
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth?mode=reset`,
      });
      if (error) throw error;
      setStatusMessage("If an account exists for this email, a secure reset link is on its way.");
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast.error(error.errors[0].message);
      } else {
        toast.error(error instanceof Error ? error.message : "Unable to send the reset email");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatusMessage(null);

    try {
      passwordSchema.parse(newPassword);
      if (newPassword !== confirmPassword) {
        throw new Error("Passwords do not match");
      }

      setIsSubmitting(true);
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;

      toast.success("Password updated successfully");
      setStatusMessage("Your password has been updated. You can now continue to A Challenge.");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast.error(error.errors[0].message);
      } else {
        toast.error(error instanceof Error ? error.message : "Unable to update your password");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Validate inputs
      emailSchema.parse(loginEmail);
      passwordSchema.parse(loginPassword);

      const { error } = await supabase.auth.signInWithPassword({
        email: loginEmail,
        password: loginPassword,
      });

      if (error) {
        if (error.message.includes("Invalid login credentials")) {
          toast.error("Invalid email or password");
        } else {
          toast.error(error.message);
        }
        return;
      }

      await supabase.auth.signOut({ scope: "local" });
      const { error: otpError } = await supabase.auth.signInWithOtp({
        email: loginEmail,
        options: { shouldCreateUser: false },
      });
      if (otpError) throw otpError;

      setPendingEmail(loginEmail);
      setOtpType("email");
      setOtpCode("");
      setStatusMessage("We sent a 6-digit confirmation code to your email.");
      setAuthView("otp");
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast.error(error.errors[0].message);
      } else {
        toast.error("An error occurred during login");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Validate inputs
      emailSchema.parse(signupEmail);
      passwordSchema.parse(signupPassword);
      usernameSchema.parse(signupUsername);

      const redirectUrl = `${window.location.origin}/`;

      const { error } = await supabase.auth.signUp({
        email: signupEmail,
        password: signupPassword,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            username: signupUsername,
            display_name: signupDisplayName || signupUsername,
            // The database resolves the code after the auth user is created.
            // Never expose or trust a referrer profile id supplied by the client.
            referral_code: referralCode,
          },
        },
      });

      if (error) {
        if (error.message.includes("User already registered")) {
          toast.error("This email is already registered. Please sign in instead.");
        } else {
          toast.error(error.message);
        }
        return;
      }

      setPendingEmail(signupEmail);
      setOtpType("signup");
      setOtpCode("");
      setStatusMessage("Account created. Enter the 6-digit code sent to your email.");
      setAuthView("otp");
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast.error(error.errors[0].message);
      } else {
        toast.error("An error occurred during signup");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOtpVerification = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsSubmitting(true);
    try {
      const { error } = await supabase.auth.verifyOtp({
        email: pendingEmail,
        token: otpCode.trim(),
        type: otpType,
      });
      if (error) throw error;
      toast.success("Email confirmed. Welcome to A Challenge!");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "That code could not be verified");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOtpResend = async () => {
    setIsSubmitting(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: pendingEmail,
        options: { shouldCreateUser: false },
      });
      if (error) throw error;
      setOtpType("email");
      setStatusMessage("A new confirmation code is on its way.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not resend the code");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleLogin = async () => {
    setIsSubmitting(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/`,
        },
      });

      if (error) {
        toast.error(error.message);
      }
    } catch (error) {
      toast.error("Failed to sign in with Google");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-10 w-10 animate-spin text-primary" role="status" aria-label="Loading your session" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center space-y-2">
          <div className="mb-4 flex items-center justify-center">
            <AChallengeLogo className="scale-125" />
          </div>
          <p className="text-muted-foreground">
            Join the creative challenge community
          </p>
        </div>

        <Card className="p-6">
          {authView === "forgot" ? (
            <div className="space-y-6">
              <div className="space-y-2 text-center">
                <KeyRound className="mx-auto h-10 w-10 text-primary" aria-hidden="true" />
                <h2 className="text-2xl font-bold">Reset your password</h2>
                <p className="text-sm text-muted-foreground">
                  Enter your email and we’ll send you a secure reset link.
                </p>
              </div>
              {statusMessage && (
                <p className="rounded-lg border border-success/30 bg-success/10 p-3 text-sm" role="status">
                  {statusMessage}
                </p>
              )}
              <form onSubmit={handleRecoveryRequest} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="recovery-email">Email</Label>
                  <Input
                    id="recovery-email"
                    type="email"
                    autoComplete="email"
                    value={recoveryEmail}
                    onChange={(event) => setRecoveryEmail(event.target.value)}
                    required
                  />
                </div>
                <Button type="submit" className="w-full" disabled={isSubmitting}>
                  {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />}
                  Send reset link
                </Button>
              </form>
              <Button variant="ghost" className="w-full" onClick={() => { setAuthView("login"); setStatusMessage(null); }}>
                <ArrowLeft className="mr-2 h-4 w-4" aria-hidden="true" />
                Back to sign in
              </Button>
            </div>
          ) : authView === "reset" ? (
            <div className="space-y-6">
              <div className="space-y-2 text-center">
                <KeyRound className="mx-auto h-10 w-10 text-primary" aria-hidden="true" />
                <h2 className="text-2xl font-bold">Choose a new password</h2>
                <p className="text-sm text-muted-foreground">Use at least 6 characters for your new password.</p>
              </div>
              {statusMessage && (
                <p className="rounded-lg border border-success/30 bg-success/10 p-3 text-sm" role="status">
                  {statusMessage}
                </p>
              )}
              <form onSubmit={handlePasswordUpdate} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="new-password">New password</Label>
                  <Input id="new-password" type="password" autoComplete="new-password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm-password">Confirm new password</Label>
                  <Input id="confirm-password" type="password" autoComplete="new-password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} required />
                </div>
                <Button type="submit" className="w-full" disabled={isSubmitting}>
                  {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />}
                  Update password
                </Button>
              </form>
              {statusMessage && <Button className="w-full" onClick={() => window.location.assign("/")}>Continue to A Challenge</Button>}
            </div>
          ) : authView === "otp" ? (
            <div className="space-y-6">
              <div className="space-y-2 text-center">
                <KeyRound className="mx-auto h-10 w-10 text-primary" aria-hidden="true" />
                <h2 className="text-2xl font-bold">Confirm your email</h2>
                <p className="text-sm text-muted-foreground">Enter the 6-digit code sent to {pendingEmail}.</p>
              </div>
              {statusMessage && <p className="rounded-lg border border-primary/30 bg-primary/10 p-3 text-sm" role="status">{statusMessage}</p>}
              <form onSubmit={handleOtpVerification} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email-code">Confirmation code</Label>
                  <Input
                    id="email-code"
                    value={otpCode}
                    onChange={(event) => setOtpCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    placeholder="000000"
                    className="text-center text-2xl font-black tracking-[0.45em]"
                    minLength={6}
                    maxLength={6}
                    required
                  />
                </div>
                <Button type="submit" className="w-full" disabled={isSubmitting || otpCode.length !== 6}>
                  {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />}
                  Confirm and enter
                </Button>
              </form>
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={handleOtpResend} disabled={isSubmitting}>Resend code</Button>
                <Button variant="ghost" className="flex-1" onClick={() => { setAuthView("login"); setStatusMessage(null); }}>Back</Button>
              </div>
            </div>
          ) : (
          <Tabs value={authView} onValueChange={(value) => setAuthView(value as AuthView)} className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="login">{t("auth.login")}</TabsTrigger>
              <TabsTrigger value="signup">{t("auth.signup")}</TabsTrigger>
            </TabsList>

            <TabsContent value="login" className="space-y-4">
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="login-email">{t("auth.email")}</Label>
                  <Input
                    id="login-email"
                    type="email"
                    placeholder="your@email.com"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    required
                    autoComplete="email"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="login-password">{t("auth.password")}</Label>
                  <Input
                    id="login-password"
                    type="password"
                    placeholder="••••••••"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                  />
                </div>
                <Button
                  type="submit"
                  className="w-full"
                  disabled={isSubmitting}
                >
                  <Mail className="w-4 h-4 mr-2" />
                  {isSubmitting ? t("auth.signingIn") : t("auth.signIn")}
                </Button>
              </form>

              <Button type="button" variant="link" className="h-auto w-full p-0 text-sm" onClick={() => { setAuthView("forgot"); setStatusMessage(null); }}>
                Forgot your password?
              </Button>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card px-2 text-muted-foreground">{t("auth.signInWith")}</span>
                </div>
              </div>

              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={handleGoogleLogin}
                disabled={isSubmitting}
              >
                <Chrome className="w-4 h-4 mr-2" />
                Google
              </Button>
            </TabsContent>

            <TabsContent value="signup" className="space-y-4">
              {referralCode && (
                <div className="p-3 bg-primary/10 rounded-lg border border-primary/20">
                  <p className="text-sm text-foreground">
                    🎉 Referral code applied! You'll get <span className="font-bold">25 coins</span> when you sign up.
                  </p>
                </div>
              )}
              <form onSubmit={handleSignup} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signup-username">{t("auth.username")}</Label>
                  <Input
                    id="signup-username"
                    type="text"
                    placeholder="coolcreator"
                    value={signupUsername}
                    onChange={(e) => setSignupUsername(e.target.value)}
                    required
                    autoComplete="username"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-display-name">{t("auth.displayName")}</Label>
                  <Input
                    id="signup-display-name"
                    type="text"
                    placeholder="Cool Creator"
                    value={signupDisplayName}
                    onChange={(e) => setSignupDisplayName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-email">{t("auth.email")}</Label>
                  <Input
                    id="signup-email"
                    type="email"
                    placeholder="your@email.com"
                    value={signupEmail}
                    onChange={(e) => setSignupEmail(e.target.value)}
                    required
                    autoComplete="email"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-password">{t("auth.password")}</Label>
                  <Input
                    id="signup-password"
                    type="password"
                    placeholder="••••••••"
                    value={signupPassword}
                    onChange={(e) => setSignupPassword(e.target.value)}
                    required
                    autoComplete="new-password"
                  />
                </div>
                <Button
                  type="submit"
                  className="w-full"
                  disabled={isSubmitting}
                >
                  <Flag className="w-4 h-4 mr-2" />
                  {isSubmitting ? t("auth.creatingAccount") : t("auth.createAccount")}
                </Button>
              </form>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card px-2 text-muted-foreground">Or continue with</span>
                </div>
              </div>

              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={handleGoogleLogin}
                disabled={isSubmitting}
              >
                <Chrome className="w-4 h-4 mr-2" />
                Google
              </Button>
            </TabsContent>
          </Tabs>
          )}
        </Card>
      </div>
    </div>
  );
};

export default Auth;
