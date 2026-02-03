import type { ICellRendererParams } from 'ag-grid-community';
import { Eye, Edit, Trash } from 'lucide-react';
import { Button } from '@/components/ui/button';

export interface ActionsCellParams extends ICellRendererParams {
  onView?: (data: unknown) => void;
  onEdit?: (data: unknown) => void;
  onDelete?: (data: unknown) => void;
}

export function ActionsCell(params: ActionsCellParams) {
  const handleClick = (e: React.MouseEvent, callback?: (data: unknown) => void) => {
    e.stopPropagation();
    if (callback && params.data) {
      callback(params.data);
    }
  };

  return (
    <div className="flex gap-1">
      {params.onView && (
        <Button
          variant="ghost"
          size="sm"
          onClick={(e) => handleClick(e, params.onView)}
        >
          <Eye className="h-4 w-4" />
        </Button>
      )}
      {params.onEdit && (
        <Button
          variant="ghost"
          size="sm"
          onClick={(e) => handleClick(e, params.onEdit)}
        >
          <Edit className="h-4 w-4" />
        </Button>
      )}
      {params.onDelete && (
        <Button
          variant="ghost"
          size="sm"
          onClick={(e) => handleClick(e, params.onDelete)}
        >
          <Trash className="h-4 w-4 text-red-500" />
        </Button>
      )}
    </div>
  );
}
