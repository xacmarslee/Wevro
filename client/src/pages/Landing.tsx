import { Button } from "@/components/ui/button";
import { Sparkles } from "lucide-react";

export default function Landing() {
  const handleLogin = () => {
    window.location.href = "/api/login";
  };

  return (
    <div className="flex items-center justify-center min-h-screen p-8">
      <div className="text-center space-y-6 max-w-2xl">
        <div className="flex justify-center mb-4">
          <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center">
            <Sparkles className="w-8 h-8 text-primary-foreground" />
          </div>
        </div>
        
        <h1 className="text-5xl font-bold tracking-tight">
          Wevro
        </h1>
        
        <p className="text-xl text-muted-foreground">
          AI-Powered Mind-Map Vocabulary Learning
        </p>
        
        <p className="text-muted-foreground max-w-lg mx-auto">
          Master English vocabulary through interactive mind maps powered by AI. 
          Explore word relationships, practice with flashcards, and track your progress.
        </p>
        
        <div className="pt-4">
          <Button 
            size="lg" 
            onClick={handleLogin}
            data-testid="button-login"
            className="px-8"
          >
            Sign In to Start Learning
          </Button>
        </div>
        
        <p className="text-sm text-muted-foreground pt-4">
          Supports Google, GitHub, email, and more
        </p>
      </div>
    </div>
  );
}
