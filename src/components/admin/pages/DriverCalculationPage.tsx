import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus } from 'lucide-react';

interface DriverModel {
  id: string;
  modelType: string;
  baseFare: number;
  perKmRate?: number;
  perMinuteRate?: number;
  minimumFare?: number;
  // New fields for oneway/hourly models
  minKmIncluded?: number;
  extraPerKm?: number;
  includedMinutes?: number;
  extraPerMinute?: number;
  pickCharges?: number;
  nightCharges?: number;
  cancellationFee?: number;
  insurance?: number;
  extraChargesFromAdmin?: number;
  gst?: number;
  discount?: number;
  // peakHoursChargePerKm?: number;
  // peakHoursChargePerMinute?: number;
  // peakDateChargePerKm?: number;
  // peakDateChargePerMinute?: number;
}

const modelTypes = [
  { value: 'oneway', label: 'One Way Model' },
  { value: 'roundtrip', label: 'Round Trip Model' },
  { value: 'hourly', label: 'Hourly Model' },
  { value: 'monthly', label: 'Monthly Driver Model' },
  { value: 'weekly', label: 'Weekly Driver Model' }
];

export const DriverCalculationPage = () => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedModelType, setSelectedModelType] = useState('');
  const [models, setModels] = useState<DriverModel[]>([]);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    baseFare: '',
    perKmRate: '',
    perMinuteRate: '',
    minimumFare: '',
    minKmIncluded: '',
    extraPerKm: '',
    includedMinutes: '',
    extraPerMinute: '',
    pickCharges: '',
    nightCharges: '',
    cancellationFee: '',
    insurance: '',
    extraChargesFromAdmin: '',
    gst: '',
    discount: '',
    // peakHoursChargePerKm: '',
    // peakHoursChargePerMinute: '',
    // peakDateChargePerKm: '',
    // peakDateChargePerMinute: ''
  });

  const isComprehensiveModel = selectedModelType === 'oneway' || selectedModelType === 'hourly';

  // Fetch existing models on component mount
  const fetchModels = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/ride-costs`);
      const result = await response.json();

      if (response.ok && result.success) {
        const displayModels = result.data.map((model: any) => ({
          id: model._id,
          modelType: modelTypes.find(m => m.value === model.modelType)?.label || model.modelType,
          baseFare: model.baseFare,
          ...(model.modelType === 'oneway' || model.modelType === 'hourly' ? {
            minKmIncluded: model.minKmIncluded,
            extraPerKm: model.extraPerKm,
            includedMinutes: model.includedMinutes,
            extraPerMinute: model.extraPerMinute,
            pickCharges: model.pickCharges,
            nightCharges: model.nightCharges,
            cancellationFee: model.cancellationFee,
            insurance: model.insurance,
            extraChargesFromAdmin: model.extraChargesFromAdmin,
            gst: model.gst,
            discount: model.discount,
            // peakHoursChargePerKm: model.peakHoursChargePerKm,
            // peakHoursChargePerMinute: model.peakHoursChargePerMinute,
            // peakDateChargePerKm: model.peakDateChargePerKm,
            // peakDateChargePerMinute: model.peakDateChargePerMinute
          } : {
            perKmRate: model.perKmRate,
            perMinuteRate: model.perMinuteRate,
            minimumFare: model.minimumFare
          })
        }));
        setModels(displayModels);
      } else {
        console.error('Error fetching models:', result.error);
      }
    } catch (error) {
      console.error('Network error:', error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch models when component mounts
  useEffect(() => {
    fetchModels();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedModelType) return;

    const modelData = {
      modelType: selectedModelType,
      baseFare: parseFloat(formData.baseFare),
      ...(isComprehensiveModel ? {
        minKmIncluded: parseFloat(formData.minKmIncluded),
        extraPerKm: parseFloat(formData.extraPerKm),
        includedMinutes: parseFloat(formData.includedMinutes),
        extraPerMinute: parseFloat(formData.extraPerMinute),
        pickCharges: parseFloat(formData.pickCharges),
        nightCharges: parseFloat(formData.nightCharges),
        cancellationFee: parseFloat(formData.cancellationFee),
        insurance: parseFloat(formData.insurance),
        extraChargesFromAdmin: parseFloat(formData.extraChargesFromAdmin),
        gst: parseFloat(formData.gst),
        discount: parseFloat(formData.discount),
        // peakHoursChargePerKm: parseFloat(formData.peakHoursChargePerKm),
        // peakHoursChargePerMinute: parseFloat(formData.peakHoursChargePerMinute),
        // peakDateChargePerKm: parseFloat(formData.peakDateChargePerKm),
        // peakDateChargePerMinute: parseFloat(formData.peakDateChargePerMinute)
      } : {
        perKmRate: parseFloat(formData.perKmRate),
        perMinuteRate: parseFloat(formData.perMinuteRate),
        minimumFare: parseFloat(formData.minimumFare)
      })
    };

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/ride-costs`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(modelData)
      });

      const result = await response.json();

      if (response.ok && result.success) {
        // Create display model for the table
        const newDisplayModel: DriverModel = {
          id: result.data._id,
          modelType: modelTypes.find(m => m.value === selectedModelType)?.label || '',
          baseFare: result.data.baseFare,
          ...(isComprehensiveModel ? {
            minKmIncluded: result.data.minKmIncluded,
            extraPerKm: result.data.extraPerKm,
            includedMinutes: result.data.includedMinutes,
            extraPerMinute: result.data.extraPerMinute,
            pickCharges: result.data.pickCharges,
            nightCharges: result.data.nightCharges,
            cancellationFee: result.data.cancellationFee,
            insurance: result.data.insurance,
            extraChargesFromAdmin: result.data.extraChargesFromAdmin,
            gst: result.data.gst,
            discount: result.data.discount,
            // peakHoursChargePerKm: result.data.peakHoursChargePerKm,
            // peakHoursChargePerMinute: result.data.peakHoursChargePerMinute,
            // peakDateChargePerKm: result.data.peakDateChargePerKm,
            // peakDateChargePerMinute: result.data.peakDateChargePerMinute
          } : {
            perKmRate: result.data.perKmRate,
            perMinuteRate: result.data.perMinuteRate,
            minimumFare: result.data.minimumFare
          })
        };

        setModels([...models, newDisplayModel]);
        
        // Reset form
        setFormData({
          baseFare: '',
          perKmRate: '',
          perMinuteRate: '',
          minimumFare: '',
          minKmIncluded: '',
          extraPerKm: '',
          includedMinutes: '',
          extraPerMinute: '',
          pickCharges: '',
          nightCharges: '',
          cancellationFee: '',
          insurance: '',
          extraChargesFromAdmin: '',
          gst: '',
          discount: '',
          // peakHoursChargePerKm: '',
          // peakHoursChargePerMinute: '',
          // peakDateChargePerKm: '',
          // peakDateChargePerMinute: ''
        });
        setSelectedModelType('');
        setIsDialogOpen(false);
        
        // Show success message (you can implement a toast notification here)
        console.log('Model created successfully:', result.message);
      } else {
        // Handle error
        console.error('Error creating model:', result.error);
        alert('Error creating model: ' + result.error);
      }
    } catch (error) {
      console.error('Network error:', error);
      alert('Network error: Please try again');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/ride-costs/${id}`, {
        method: 'DELETE'
      });

      const result = await response.json();

      if (response.ok && result.success) {
        setModels(models.filter(model => model.id !== id));
        console.log('Model deleted successfully');
      } else {
        console.error('Error deleting model:', result.error);
        alert('Error deleting model: ' + result.error);
      }
    } catch (error) {
      console.error('Network error:', error);
      alert('Network error: Please try again');
    }
  };

  const renderComprehensiveFields = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="baseFare">Base Fare</Label>
          <Input
            id="baseFare"
            type="number"
            step="0.01"
            value={formData.baseFare}
            onChange={(e) => setFormData({ ...formData, baseFare: e.target.value })}
            className="bg-gray-700 border-gray-600 text-white"
            required
          />
        </div>
        <div>
          <Label htmlFor="minKmIncluded">Min Km Included</Label>
          <Input
            id="minKmIncluded"
            type="number"
            step="0.01"
            value={formData.minKmIncluded}
            onChange={(e) => setFormData({ ...formData, minKmIncluded: e.target.value })}
            className="bg-gray-700 border-gray-600 text-white"
            required
          />
        </div>
        <div>
          <Label htmlFor="extraPerKm">Extra Per Km</Label>
          <Input
            id="extraPerKm"
            type="number"
            step="0.01"
            value={formData.extraPerKm}
            onChange={(e) => setFormData({ ...formData, extraPerKm: e.target.value })}
            className="bg-gray-700 border-gray-600 text-white"
            required
          />
        </div>
        <div>
          <Label htmlFor="includedMinutes">Included Minutes</Label>
          <Input
            id="includedMinutes"
            type="number"
            step="0.01"
            value={formData.includedMinutes}
            onChange={(e) => setFormData({ ...formData, includedMinutes: e.target.value })}
            className="bg-gray-700 border-gray-600 text-white"
            required
          />
        </div>
        <div>
          <Label htmlFor="extraPerMinute">Extra Per Minute</Label>
          <Input
            id="extraPerMinute"
            type="number"
            step="0.01"
            value={formData.extraPerMinute}
            onChange={(e) => setFormData({ ...formData, extraPerMinute: e.target.value })}
            className="bg-gray-700 border-gray-600 text-white"
            required
          />
        </div>
        <div>
          <Label htmlFor="pickCharges">Pick Charges</Label>
          <Input
            id="pickCharges"
            type="number"
            step="0.01"
            value={formData.pickCharges}
            onChange={(e) => setFormData({ ...formData, pickCharges: e.target.value })}
            className="bg-gray-700 border-gray-600 text-white"
            required
          />
        </div>
        <div>
          <Label htmlFor="nightCharges">Night Charges</Label>
          <Input
            id="nightCharges"
            type="number"
            step="0.01"
            value={formData.nightCharges}
            onChange={(e) => setFormData({ ...formData, nightCharges: e.target.value })}
            className="bg-gray-700 border-gray-600 text-white"
            required
          />
        </div>
        <div>
          <Label htmlFor="cancellationFee">Cancellation Fee</Label>
          <Input
            id="cancellationFee"
            type="number"
            step="0.01"
            value={formData.cancellationFee}
            onChange={(e) => setFormData({ ...formData, cancellationFee: e.target.value })}
            className="bg-gray-700 border-gray-600 text-white"
            required
          />
        </div>
        <div>
          <Label htmlFor="insurance">Insurance</Label>
          <Input
            id="insurance"
            type="number"
            step="0.01"
            value={formData.insurance}
            onChange={(e) => setFormData({ ...formData, insurance: e.target.value })}
            className="bg-gray-700 border-gray-600 text-white"
            required
          />
        </div>
        <div>
          <Label htmlFor="extraChargesFromAdmin">Extra Charges from Admin in %</Label>
          <Input
            id="extraChargesFromAdmin"
            type="number"
            step="0.01"
            value={formData.extraChargesFromAdmin}
            onChange={(e) => setFormData({ ...formData, extraChargesFromAdmin: e.target.value })}
            className="bg-gray-700 border-gray-600 text-white"
            required
          />
        </div>
        <div>
          <Label htmlFor="gst">GST in %</Label>
          <Input
            id="gst"
            type="number"
            step="0.01"
            value={formData.gst}
            onChange={(e) => setFormData({ ...formData, gst: e.target.value })}
            className="bg-gray-700 border-gray-600 text-white"
            required
          />
        </div>
        <div>
          <Label htmlFor="discount">Discount</Label>
          <Input
            id="discount"
            type="number"
            step="0.01"
            value={formData.discount}
            onChange={(e) => setFormData({ ...formData, discount: e.target.value })}
            className="bg-gray-700 border-gray-600 text-white"
            required
          />
        </div>
        {/* <div>
          <Label htmlFor="peakHoursChargePerKm">Peak Hours Charge Per Km</Label>
          <Input
            id="peakHoursChargePerKm"
            type="number"
            step="0.01"
            value={formData.peakHoursChargePerKm}
            onChange={(e) => setFormData({ ...formData, peakHoursChargePerKm: e.target.value })}
            className="bg-gray-700 border-gray-600 text-white"
            required
          />
        </div>
        <div>
          <Label htmlFor="peakHoursChargePerMinute">Peak Hours Charge Per Minute</Label>
          <Input
            id="peakHoursChargePerMinute"
            type="number"
            step="0.01"
            value={formData.peakHoursChargePerMinute}
            onChange={(e) => setFormData({ ...formData, peakHoursChargePerMinute: e.target.value })}
            className="bg-gray-700 border-gray-600 text-white"
            required
          />
        </div>
        <div>
          <Label htmlFor="peakDateChargePerKm">Peak Date Charge Per Km</Label>
          <Input
            id="peakDateChargePerKm"
            type="number"
            step="0.01"
            value={formData.peakDateChargePerKm}
            onChange={(e) => setFormData({ ...formData, peakDateChargePerKm: e.target.value })}
            className="bg-gray-700 border-gray-600 text-white"
            required
          />
        </div>
        <div>
          <Label htmlFor="peakDateChargePerMinute">Peak Date Charge Per Minute</Label>
          <Input
            id="peakDateChargePerMinute"
            type="number"
            step="0.01"
            value={formData.peakDateChargePerMinute}
            onChange={(e) => setFormData({ ...formData, peakDateChargePerMinute: e.target.value })}
            className="bg-gray-700 border-gray-600 text-white"
            required
          />
        </div> */}
      </div>
    </div>
  );

  const renderSimpleFields = () => (
    <div className="grid grid-cols-2 gap-4">
      <div>
        <Label htmlFor="baseFare">Base Fare</Label>
        <Input
          id="baseFare"
          type="number"
          step="0.01"
          value={formData.baseFare}
          onChange={(e) => setFormData({ ...formData, baseFare: e.target.value })}
          className="bg-gray-700 border-gray-600 text-white"
          required
        />
      </div>
      <div>
        <Label htmlFor="perKmRate">Per KM Rate</Label>
        <Input
          id="perKmRate"
          type="number"
          step="0.01"
          value={formData.perKmRate}
          onChange={(e) => setFormData({ ...formData, perKmRate: e.target.value })}
          className="bg-gray-700 border-gray-600 text-white"
          required
        />
      </div>
      <div>
        <Label htmlFor="perMinuteRate">Per Minute Rate</Label>
        <Input
          id="perMinuteRate"
          type="number"
          step="0.01"
          value={formData.perMinuteRate}
          onChange={(e) => setFormData({ ...formData, perMinuteRate: e.target.value })}
          className="bg-gray-700 border-gray-600 text-white"
          required
        />
      </div>
      <div>
        <Label htmlFor="minimumFare">Minimum Fare</Label>
        <Input
          id="minimumFare"
          type="number"
          step="0.01"
          value={formData.minimumFare}
          onChange={(e) => setFormData({ ...formData, minimumFare: e.target.value })}
          className="bg-gray-700 border-gray-600 text-white"
          required
        />
      </div>
    </div>
  );

  const renderTableHeaders = () => {
    if (isComprehensiveModel && models.some(m => m.modelType === 'One Way Model' || m.modelType === 'Hourly Model')) {
      return (
        <tr className="border-b border-gray-700">
          <th className="text-left py-3 px-4 text-gray-300">Model Type</th>
          {/* <th className="text-left py-3 px-4 text-gray-300">Base Fare</th>
          <th className="text-left py-3 px-4 text-gray-300">Min Km</th>
          <th className="text-left py-3 px-4 text-gray-300">Extra/Km</th>
          <th className="text-left py-3 px-4 text-gray-300">Inc. Min</th>
          <th className="text-left py-3 px-4 text-gray-300">Extra/Min</th>
          <th className="text-left py-3 px-4 text-gray-300">Pick Charges</th>
          <th className="text-left py-3 px-4 text-gray-300">Night Charges</th> */}
          <th className="text-left py-3 px-4 text-gray-300">Actions</th>
        </tr>
      );
    }
    
    return (
      <tr className="border-b border-gray-700">
        <th className="text-left py-3 px-4 text-gray-300">Model Type</th>

        <th className="text-left py-3 px-4 text-gray-300">Actions</th>
      </tr>
    );
  };

  const renderTableRow = (model: DriverModel) => {
    if (model.modelType === 'One Way Model' || model.modelType === 'Hourly Model') {
      return (
        <tr key={model.id} className="border-b border-gray-700">
          <td className="py-3 px-4 text-white">{model.modelType}</td>

          <td className="py-3 px-4">
            <Button
              variant="destructive"
              size="sm"
              onClick={() => handleDelete(model.id)}
            >
              Delete
            </Button>
          </td>
        </tr>
      );
    }
    
    return (
      <tr key={model.id} className="border-b border-gray-700">
        <td className="py-3 px-4 text-white">{model.modelType}</td>
        <td className="py-3 px-4 text-white">${model.baseFare}</td>
        <td className="py-3 px-4 text-white">${model.perKmRate}</td>
        <td className="py-3 px-4 text-white">${model.perMinuteRate}</td>
        <td className="py-3 px-4 text-white">${model.minimumFare}</td>
        <td className="py-3 px-4">
          <Button
            variant="destructive"
            size="sm"
            onClick={() => handleDelete(model.id)}
          >
            Delete
          </Button>
        </td>
      </tr>
    );
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-white">Driver Calculation Model</h1>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-blue-600 hover:bg-blue-700 text-white">
              <Plus className="w-4 h-4 mr-2" />
              Add Driver Model
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-4xl bg-gray-800 text-white border-gray-700 max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Add Driver Calculation Model</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="modelType">Model Type</Label>
                <Select value={selectedModelType} onValueChange={setSelectedModelType}>
                  <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                    <SelectValue placeholder="Select model type" />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-700 border-gray-600">
                    {modelTypes.map((type) => (
                      <SelectItem key={type.value} value={type.value} className="text-white hover:bg-gray-600">
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedModelType && (
                isComprehensiveModel ? renderComprehensiveFields() : renderSimpleFields()
              )}

              <Button 
                type="button" 
                onClick={handleSubmit} 
                className="w-full bg-blue-600 hover:bg-blue-700"
                disabled={loading}
              >
                {loading ? 'Creating...' : 'Add Model'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white">Driver Calculation Models</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-gray-400 text-center py-8">Loading models...</p>
          ) : models.length === 0 ? (
            <p className="text-gray-400 text-center py-8">No driver models added yet</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  {renderTableHeaders()}
                </thead>
                <tbody>
                  {models.map(renderTableRow)}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}