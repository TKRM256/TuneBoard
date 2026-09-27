import { Button } from "@/components/ui/button";
import { useOutsideClick } from "@/lib/useOutsideClick";
import { X } from "lucide-react";
import { useRef, useState } from "react";
import { motion } from "framer-motion";

export const ConfirmButton = ({ children, onClick, defaultVariant, confirmVariant, disabled = false, validate }: { onClick?: () => void | Promise<unknown>; onSubmit?: () => void; children: React.ReactNode; defaultVariant?: "link" | "default" | "destructive" | "outline" | "secondary" | "ghost" | null | undefined; confirmVariant?: "link" | "default" | "destructive" | "outline" | "secondary" | "ghost" | null | undefined; disabled?: boolean;
    /** 確認モードに進む前の入力チェック。false を返すと確認ボタンを出さない。
     *  エラー文言の表示は呼び出し元（各項目の FieldError）に任せる。 */
    validate?: () => boolean }) => {
    const [isConfirmingMode, setIsConfirming] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const ref = useRef<HTMLDivElement>(null);
    const isProcessingRef = useRef(false);

    useOutsideClick({ ref, callback: () => {
        if (!isProcessingRef.current) {
            setIsConfirming(false);
        }
    } });

    const handleClick = async () =>{
        if (disabled || isProcessingRef.current) {
            return;
        }

        if(isConfirmingMode){
            if(!onClick) {
                return;
            }

            isProcessingRef.current = true;
            setIsProcessing(true);

            try {
                await onClick();
                setIsConfirming(false);
            } catch (error) {
                void error;
            } finally {
                isProcessingRef.current = false;
                setIsProcessing(false);
            }
        }else{
            // 入力に不備があるうちは確認ボタンを出さない（理由は各項目の下に出る）
            if (validate && !validate()) {
                return;
            }
            setIsConfirming(true);
        }
    }

    return (
        <div ref={ref}>
            <motion.div className="flex items-center space-x-2">
                <Button onClick={() => { void handleClick(); }} type="button" variant={ isConfirmingMode ? confirmVariant : defaultVariant} disabled={disabled || isProcessing}>
                    {isConfirmingMode && "本当に"}
                    {children}
                </Button>
                {isConfirmingMode && (
                    <Button variant="secondary" onClick ={()=>{setIsConfirming(false)}} disabled={disabled || isProcessing}>
                        <X/>
                    </Button>
                )}
            </motion.div>
        </div>
    );
}
