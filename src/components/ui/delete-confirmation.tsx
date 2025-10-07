import React from 'react';
import { Loader, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';

interface DeleteConfirmationProps {
  onDelete: () => void;
  itemName: string;
  isLoading?: boolean;
  disabled?: boolean;
  buttonSize?: 'sm' | 'default' | 'lg';
  buttonVariant?: 'outline' | 'destructive' | 'default';
}

export const DeleteConfirmation: React.FC<DeleteConfirmationProps> = ({
  onDelete,
  itemName,
  isLoading = false,
  disabled = false,
  buttonSize = 'sm',
  buttonVariant = 'outline'
}) => {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          variant={buttonVariant}
          size={buttonSize}
          disabled={disabled || isLoading}
          title={`Delete ${itemName}`}
        >
          {isLoading ? (
            <Loader className="w-4 h-4 animate-spin" />
          ) : (
            <Trash2 className="w-4 h-4" />
          )}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Are you sure?</AlertDialogTitle>
          <AlertDialogDescription>
            This action cannot be undone. This will permanently delete "{itemName}".
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading}>
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={onDelete}
            className="bg-red-600 hover:bg-red-700"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader className="w-4 h-4 mr-2 animate-spin" />
                Deleting...
              </>
            ) : (
              'Delete'
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};