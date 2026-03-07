import { useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { ArrowLeft, LogOut } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

export default function Game() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [, setLocation] = useLocation();
  const { logout, user } = useAuth();

  const handleLogout = () => {
    logout();
    setLocation("/");
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const loadGameScripts = async () => {
      try {
        if (user?.email) {
          const username = user.email.split('@')[0];
          localStorage.setItem("username", username);
        }

        const dungeonScript = document.createElement("script");
        dungeonScript.src = "/dungeongenerator.js";
        document.body.appendChild(dungeonScript);

        dungeonScript.onload = () => {
          const gameScript = document.createElement("script");
          gameScript.src = "/game.js";
          document.body.appendChild(gameScript);
        };
      } catch (error) {
        console.error("Erro ao carregar scripts do jogo:", error);
      }
    };

    loadGameScripts();

    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, [user]);

  return (
    <div className="relative w-full h-screen bg-black overflow-hidden">
      <canvas
        ref={canvasRef}
        id="game"
        className="block w-full h-full"
        style={{ display: "block" }}
      />

      <div className="absolute top-4 left-4 z-50 flex gap-2">
        <Button
          onClick={() => setLocation("/")}
          variant="outline"
          className="bg-gray-900/80 border-gray-700 text-gray-200 hover:bg-gray-800 hover:text-white backdrop-blur-sm"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Voltar
        </Button>
        <Button
          onClick={handleLogout}
          variant="outline"
          className="bg-gray-900/80 border-gray-700 text-gray-200 hover:bg-red-900/80 hover:text-white backdrop-blur-sm"
        >
          <LogOut className="w-4 h-4 mr-2" />
          Sair
        </Button>
      </div>

      <div className="absolute bottom-4 left-4 z-50 text-gray-400 text-xs font-mono max-w-xs">
        <p className="mb-2">
          <strong>Controles:</strong>
        </p>
        <ul className="space-y-1">
          <li>W/A/S/D - Mover</li>
          <li>Mouse - Olhar ao redor (clique para ativar)</li>
          <li>Espaço - Atirar</li>
          <li>S - Configurações</li>
          <li>Setas - Selecionar modo</li>
          <li>ENTER - Começar</li>
          <li>ESC - Menu/Sair</li>
        </ul>
      </div>
    </div>
  );
}
