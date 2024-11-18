import { Separator } from '@/components/ui/separator';

export default function Footer() {
  return (
    <footer className="p-4 text-center text-sm text-gray-500">
      <Separator className="mb-4" />
      <div>
        <p>AI Tourism Guide</p>
        <p>© 2024 All rights reserved</p>
      </div>
    </footer>
  );
}
