import type { ReactNode } from 'react';
import { Plus } from 'lucide-react';

import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

interface CreateAccordionCardProps {
  value: string;
  title: string;
  children: ReactNode;
}

export const CreateAccordionCard = ({
  value,
  title,
  children,
}: CreateAccordionCardProps) => {
  return (
    <Card>
      <Accordion type="single" collapsible>
        <AccordionItem value={value} className="border-b-0">
          <CardHeader>
            <AccordionTrigger className="items-center py-0 hover:no-underline">
              <div className="flex min-w-0 items-center gap-3 text-left sm:gap-4">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Plus className="size-4" />
                </div>
                <div className="min-w-0 space-y-1">
                  <p className="wrap-break-word text-sm font-semibold text-foreground sm:text-base">{title}</p>
                </div>
              </div>
            </AccordionTrigger>
          </CardHeader>
          <AccordionContent>
            <CardContent className="mt-2 space-y-4 px-4 pt-4 sm:px-6">
              {children}
            </CardContent>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </Card>
  );
};