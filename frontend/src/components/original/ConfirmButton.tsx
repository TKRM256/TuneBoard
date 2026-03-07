import { Button } from "@/components/ui/button";
import { useOutsideClick } from "@/lib/useOutsideClick";
import { X } from "lucide-react";
import { useRef, useState } from "react";
import { motion } from "framer-motion";

export const ConfirmButton = ({ children, onClick, defaultVariant, confirmVariant }: { onClick?: () => void; onSubmit?: () => void; children: React.ReactNode; defaultVariant?: "link" | "default" | "destructive" | "outline" | "secondary" | "ghost" | null | undefined; confirmVariant?: "link" | "default" | "destructive" | "outline" | "secondary" | "ghost" | null | undefined }) => {
    const [isConfirmingMode, setIsConfirming] = useState(false);
    const ref = useRef<HTMLDivElement>(null);
    
    useOutsideClick({ ref, callback: () => setIsConfirming(false) });

    const handleClick = () =>{
        if(isConfirmingMode){
            if(onClick) onClick();
        }else{
            setIsConfirming(true);
        }
    }

    return (
        <div ref={ref}>
            <motion.div className="flex items-center space-x-2">
                <Button onClick={handleClick} type="button" variant={ isConfirmingMode ? confirmVariant : defaultVariant}>
                    {(isConfirmingMode ? "本当に": "") + children}
                </Button>
                {isConfirmingMode && (
                    <Button variant="secondary" onClick ={()=>{setIsConfirming(false)}}>
                        <X/> 
                    </Button>
                )}
            </motion.div>
        </div>
    );
}