import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useState } from "react";
import apiClient from '../../lib/axiosInterceptor';

interface AdminExtraChargesDialogProps {
  isOpen: boolean;
  onClose: () => void;
  rideId: string;
  onSuccess: () => void;
}

export const AdminExtraChargesDialog = ({ 
  isOpen, 
  onClose, 
  rideId, 
  onSuccess 
}: AdminExtraChargesDialogProps) => {
  const [charges, setCharges] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!charges || isNaN(Number(charges))) {
      setError("Please enter valid charges amount");
      return;
    }
    setError(null);

    setLoading(true);
    try {
      const response = await apiClient.post(`${import.meta.env.VITE_API_URL}/api/rides/admin/extra-charges`, {
        rideId,
        charges: Number(charges),
        description: description.trim() || undefined
      });

      setSuccess("Extra charges added successfully!");
      setTimeout(() => {
        onSuccess();
        handleClose();
      }, 1500);
    } catch (error) {
      console.error('Error adding extra charges:', error);
      setError('Failed to add extra charges');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setCharges("");
    setDescription("");
    setError(null);
    setSuccess(null);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Ride Extra Charges</DialogTitle>
        </DialogHeader>
        
        {/* Success/Error Messages */}
        {success && (
          <Alert className="border-green-200 bg-green-50">
            <AlertDescription className="text-green-800">{success}</AlertDescription>
          </Alert>
        )}
        
        {error && (
          <Alert className="border-red-200 bg-red-50">
            <AlertDescription className="text-red-800">{error}</AlertDescription>
          </Alert>
        )}
        
        <div className="space-y-4">
          <div>
            <Label htmlFor="charges">Charges Amount (₹)</Label>
            <Input
              id="charges"
              type="number"
              placeholder="Enter charges amount"
              value={charges}
              onChange={(e) => setCharges(e.target.value)}
              min="0"
              step="0.01"
            />
          </div>
          <div>
            <Label htmlFor="description">Description (Optional)</Label>
            <Textarea
              id="description"
              placeholder="Enter description for the extra charges"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading || !charges}>
            {loading ? 'Adding...' : 'Add Charges'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};