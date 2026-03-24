import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface OrderFiltersProps {
  searchQuery: string;
  statusFilter: string;
  allowedStatuses: string[];
  onSearchChange: (value: string) => void;
  onStatusFilterChange: (value: string) => void;
}

export function OrderFilters({
  searchQuery,
  statusFilter,
  allowedStatuses,
  onSearchChange,
  onStatusFilterChange,
}: OrderFiltersProps) {
  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
      <div>
        <h1 className="text-3xl font-light tracking-wide">Order Operations</h1>
        <p className="text-muted-foreground mt-2">Review live orders, shipping details, and fulfillment status in one place.</p>
      </div>
      <div className="flex flex-col gap-3 md:flex-row">
        <Input
          value={searchQuery}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Search by order number or customer"
          className="w-full md:w-72"
        />
        <Select value={statusFilter} onValueChange={onStatusFilterChange}>
          <SelectTrigger className="h-10 w-full md:w-44 rounded-none border-2 border-foreground bg-background px-3 text-sm focus:ring-0 focus:ring-offset-0">
            <SelectValue placeholder="All statuses" className="uppercase tracking-[0.12em]" />
          </SelectTrigger>
          <SelectContent className="rounded-none border-2 border-foreground bg-background text-foreground">
            <SelectItem value="all" className="rounded-none focus:bg-foreground focus:text-background uppercase tracking-[0.12em]">
              All statuses
            </SelectItem>
            {allowedStatuses.map((status) => (
              <SelectItem key={status} value={status} className="rounded-none focus:bg-foreground focus:text-background uppercase tracking-[0.12em]">
                {status}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}