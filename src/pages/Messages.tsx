import { useState } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ConversationsList from "@/components/messaging/ConversationsList";
import ConversationPanel from "@/components/messaging/ConversationPanel";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

export default function Messages() {
  const [activeConversationId, setActiveConversationId] = useState<string | undefined>();

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-24 pb-16 container mx-auto px-4">
        <div className="flex items-center gap-3 mb-6">
          <Button variant="outline" size="sm" asChild>
            <Link to="/dashboard"><ArrowLeft className="w-4 h-4 mr-1" /> Dashboard</Link>
          </Button>
          <h1 className="text-2xl font-bold text-foreground">Messages</h1>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <ConversationsList onSelectConversation={setActiveConversationId} />
          </div>
          <div>
            {activeConversationId ? (
              <ConversationPanel
                conversationId={activeConversationId}
                onClose={() => setActiveConversationId(undefined)}
              />
            ) : (
              <div className="h-[500px] flex items-center justify-center border border-dashed border-border rounded-lg">
                <p className="text-sm text-muted-foreground">Select a conversation to view messages.</p>
              </div>
            )}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
