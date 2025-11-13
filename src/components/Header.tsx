import { Button } from "@/components/ui/button";
import { Sparkles, Menu, X, User, LogOut, Wallet, Shield } from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useProfile } from "@/hooks/useProfile";
import { useUserRole } from "@/hooks/useUserRole";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { NotificationsDropdown } from "@/components/NotificationsDropdown";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useNavigate } from "react-router-dom";

export const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { user, signOut } = useAuth();
  const { data: profile } = useProfile();
  const { isAdminOrModerator } = useUserRole();
  const navigate = useNavigate();

  return (
    <header className="border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
      <div className="container flex h-16 items-center justify-between">
        <div className="flex items-center gap-8">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate('/')}>
            <Sparkles className="w-6 h-6 text-primary" />
            <span className="text-2xl font-black bg-gradient-primary bg-clip-text text-transparent">
              Questify
            </span>
          </div>
          
          <nav className="hidden md:flex items-center gap-6">
            <a href="/#challenges" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
              Challenges
            </a>
            <button onClick={() => navigate('/feed')} className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
              Feed
            </button>
            <button onClick={() => navigate('/leaderboard')} className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
              Leaderboard
            </button>
          </nav>
        </div>

        <div className="flex items-center gap-4">
          {user && profile ? (
            <div className="hidden md:flex items-center gap-3">
              <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-accent/10 border border-accent/20">
                <Sparkles className="w-4 h-4 text-accent" />
                <span className="text-sm font-semibold">{profile.points.toLocaleString()} pts</span>
              </div>

              <NotificationsDropdown />
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={profile.avatar_url || undefined} alt={profile.username} />
                      <AvatarFallback className="bg-gradient-primary text-primary-foreground">
                        {profile.username.substring(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">{profile.display_name || profile.username}</p>
                      <p className="text-xs leading-none text-muted-foreground">@{profile.username}</p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => navigate('/profile')}>
                    <User className="mr-2 h-4 w-4" />
                    Profile
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate('/wallet')}>
                    <Wallet className="mr-2 h-4 w-4" />
                    Wallet
                  </DropdownMenuItem>
                  {isAdminOrModerator && (
                    <DropdownMenuItem onClick={() => navigate('/admin')}>
                      <Shield className="mr-2 h-4 w-4" />
                      Admin Panel
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={signOut}>
                    <LogOut className="mr-2 h-4 w-4" />
                    Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ) : (
            <div className="hidden md:flex items-center gap-3">
              <Button variant="outline" onClick={() => navigate('/auth')}>Sign In</Button>
              <Button className="bg-gradient-primary hover:shadow-glow" onClick={() => navigate('/auth')}>
                Get Started
              </Button>
            </div>
          )}

          <button
            className="md:hidden p-2"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            aria-label="Toggle menu"
          >
            {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {isMenuOpen && (
        <div className="md:hidden border-t border-border">
          <nav className="container py-4 flex flex-col gap-4">
            <a href="/#challenges" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
              Challenges
            </a>
            <button onClick={() => navigate('/feed')} className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors text-left">
              Feed
            </button>
            <button onClick={() => navigate('/leaderboard')} className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors text-left">
              Leaderboard
            </button>
            <div className="flex flex-col gap-3 pt-4 border-t border-border">
              {user && profile ? (
                <>
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-muted">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={profile.avatar_url || undefined} alt={profile.username} />
                      <AvatarFallback className="bg-gradient-primary text-primary-foreground">
                        {profile.username.substring(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <p className="font-medium">{profile.display_name || profile.username}</p>
                      <p className="text-sm text-muted-foreground">{profile.points} points</p>
                    </div>
                  </div>
                  <Button variant="outline" className="w-full" onClick={signOut}>
                    <LogOut className="w-4 h-4 mr-2" />
                    Sign Out
                  </Button>
                </>
              ) : (
                <>
                  <Button variant="outline" className="w-full" onClick={() => navigate('/auth')}>
                    Sign In
                  </Button>
                  <Button className="w-full bg-gradient-primary" onClick={() => navigate('/auth')}>
                    Get Started
                  </Button>
                </>
              )}
            </div>
          </nav>
        </div>
      )}
    </header>
  );
};