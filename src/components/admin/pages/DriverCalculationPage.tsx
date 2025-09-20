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

interface Subcategory {
  id: string;
  name: string;
  description: string;
  categoryId: string;
  categoryName: string;
  image: string;
}

export const DriverCalculationPage = () => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedModelType, setSelectedModelType] = useState('');
  const [models, setModels] = useState<DriverModel[]>([]);
  const [loading, setLoading] = useState(false);
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [selectedModel, setSelectedModel] = useState<DriverModel | null>(null);
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
  });

  const isComprehensiveModel = selectedModelType === 'One-Way' || selectedModelType === 'Hourly';

  // Fetch subcategories
  const fetchSubcategories = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/subcategories`);
      const result = await response.json();
      if (response.ok) {
        setSubcategories(result);
      }
    } catch (error) {
      console.error('Error fetching subcategories:', error);
    }
  };

  // Fetch existing models on component mount
  const fetchModels = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/ride-costs`);
      const result = await response.json();

      if (response.ok && result.success) {
        const displayModels = result.data.map((model: any) => {
          const isOneWay = model.modelType === 'driver-one-way';
          const isHourly = model.modelType === 'driver-hourly';

          return {
            id: model._id,
            modelType: model.modelType,
            baseFare: model.baseFare ?? 0, // fallback if not in API
            ...(isOneWay || isHourly
              ? {
                minKmIncluded: model.minKmIncluded ?? 0,
                extraPerKm: model.extraPerKm,
                includedMinutes: model.includedMinutes ?? 0,
                extraPerMinute: model.extraPerMinute,
                pickCharges: model.pickCharges,
                nightCharges: model.nightCharges,
                cancellationFee: model.cancellationFee,
                insurance: model.insurance,
                extraChargesFromAdmin: model.extraChargesFromAdmin,
                gst: model.gst,
                discount: model.discount,
              }
              : {
                perKmRate: model.perKmRate,
                perMinuteRate: model.perMinuteRate,
                minimumFare: model.minimumFare,
              }),
          };
        });

        setModels(displayModels);
        console.log('Fetched models:', displayModels);
      } else {
        console.error('Error fetching models:', result.error);
      }
    } catch (error) {
      console.error('Network error:', error);
    } finally {
      setLoading(false);
    }
  };


  // Fetch data when component mounts
  useEffect(() => {
    fetchSubcategories();
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
          modelType: selectedModelType,
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

  const handleView = (model: DriverModel) => {
    setSelectedModel(model);
    setViewDialogOpen(true);
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
            className="bg-white border-gray-300 text-black"
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
            className="bg-white border-gray-300 text-black"
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
            className="bg-white border-gray-300 text-black"
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
            className="bg-white border-gray-300 text-black"
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
            className="bg-white border-gray-300 text-black"
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
            className="bg-white border-gray-300 text-black"
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
            className="bg-white border-gray-300 text-black"
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
            className="bg-white border-gray-300 text-black"
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
            className="bg-white border-gray-300 text-black"
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
            className="bg-white border-gray-300 text-black"
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
            className="bg-white border-gray-300 text-black"
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
            className="bg-white border-gray-300 text-black"
            required
          />
        </div>
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
          className="bg-white border-gray-300 text-black"
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
          className="bg-white border-gray-300 text-black"
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
          className="bg-white border-gray-300 text-white"
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
          className="bg-white border-gray-300 text-black"
          required
        />
      </div>
    </div>
  );

  const renderTableHeaders = () => {
    if (models.some(m => m.modelType === 'driver-one-way' || m.modelType === 'driver-hourly')) {
      return (
        <tr className="border-b border-gray-300">
          <th className="text-left py-3 px-4 text-black">Model Type</th>
          <th className="text-left py-3 px-4 text-black">Actions</th>
        </tr>
      );
    }

    return (
      <tr className="border-b border-gray-300">
        <th className="text-left py-3 px-4 text-black">Model Type</th>
        <th className="text-left py-3 px-4 text-black">Actions</th>
      </tr>
    );
  };

  const renderTableRow = (model: DriverModel) => {
    if (model.modelType === 'driver-one-way' || model.modelType === 'driver-hourly') {
      return (
        <tr key={model.id} className="border-b border-gray-300">
          <td className="py-3 px-4 text-black">{model.modelType}</td>

          <td className="py-3 px-4 space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleView(model)}
            >
              View
            </Button>
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
      <tr key={model.id} className="border-b border-gray-300">
        <td className="py-3 px-4 text-black">{model.modelType}</td>
        <td className="py-3 px-4 space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleView(model)}
          >
            View
          </Button>
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
    <div className="p-6 space-y-6 bg-white text-black">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Driver Calculation Model</h1>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-blue-600 hover:bg-blue-700 text-white">
              <Plus className="w-4 h-4 mr-2" />
              Add Driver Model
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-4xl bg-white text-black border border-gray-200 max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Add Driver Calculation Model</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="modelType">Model Type</Label>
                <Select value={selectedModelType} onValueChange={setSelectedModelType}>
                  <SelectTrigger className="bg-white border-gray-300 text-black">
                    <SelectValue placeholder="Select model type" />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-gray-200">
                    {subcategories.map((subcategory) => (
                      <SelectItem
                        key={subcategory.id}
                        value={subcategory.name}
                        className="text-black hover:bg-gray-100"
                      >
                        {subcategory.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedModelType &&
                (isComprehensiveModel ? renderComprehensiveFields() : renderSimpleFields())}

              <Button
                type="button"
                onClick={handleSubmit}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                disabled={loading}
              >
                {loading ? "Creating..." : "Add Model"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
          <DialogContent className="sm:max-w-2xl bg-white text-black border border-gray-200">
            <DialogHeader>
              <DialogTitle>View Driver Model Details</DialogTitle>
            </DialogHeader>
            {selectedModel && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Model Type</Label>
                    <p className="text-sm font-medium">{selectedModel.modelType}</p>
                  </div>
                  <div>
                    <Label>Base Fare</Label>
                    <p className="text-sm font-medium">${selectedModel.baseFare}</p>
                  </div>
                  {selectedModel.modelType === 'driver-one-way' || selectedModel.modelType === 'driver-hourly' ? (
                    <>
                      <div>
                        <Label>Min Km Included</Label>
                        <p className="text-sm font-medium">{selectedModel.minKmIncluded || 'N/A'}</p>
                      </div>
                      <div>
                        <Label>Extra Per Km</Label>
                        <p className="text-sm font-medium">${selectedModel.extraPerKm || 0}</p>
                      </div>
                      <div>
                        <Label>Included Minutes</Label>
                        <p className="text-sm font-medium">{selectedModel.includedMinutes || 'N/A'}</p>
                      </div>
                      <div>
                        <Label>Extra Per Minute</Label>
                        <p className="text-sm font-medium">${selectedModel.extraPerMinute || 0}</p>
                      </div>
                      <div>
                        <Label>Pick Charges</Label>
                        <p className="text-sm font-medium">${selectedModel.pickCharges || 0}</p>
                      </div>
                      <div>
                        <Label>Night Charges</Label>
                        <p className="text-sm font-medium">${selectedModel.nightCharges || 0}</p>
                      </div>
                      <div>
                        <Label>Cancellation Fee</Label>
                        <p className="text-sm font-medium">${selectedModel.cancellationFee || 0}</p>
                      </div>
                      <div>
                        <Label>Insurance</Label>
                        <p className="text-sm font-medium">${selectedModel.insurance || 0}</p>
                      </div>
                      <div>
                        <Label>Extra Charges from Admin (%)</Label>
                        <p className="text-sm font-medium">{selectedModel.extraChargesFromAdmin || 0}%</p>
                      </div>
                      <div>
                        <Label>GST (%)</Label>
                        <p className="text-sm font-medium">{selectedModel.gst || 0}%</p>
                      </div>
                      <div>
                        <Label>Discount</Label>
                        <p className="text-sm font-medium">${selectedModel.discount || 0}</p>
                      </div>
                    </>
                  ) : (
                    <>
                      <div>
                        <Label>Per KM Rate</Label>
                        <p className="text-sm font-medium">${selectedModel.perKmRate || 0}</p>
                      </div>
                      <div>
                        <Label>Per Minute Rate</Label>
                        <p className="text-sm font-medium">${selectedModel.perMinuteRate || 0}</p>
                      </div>
                      <div>
                        <Label>Minimum Fare</Label>
                        <p className="text-sm font-medium">${selectedModel.minimumFare || 0}</p>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>

      <Card className="bg-white border border-gray-200">
        <CardHeader>
          <CardTitle>Driver Calculation Models</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-gray-500 text-center py-8">Loading models...</p>
          ) : models.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No driver models added yet</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>{renderTableHeaders()}</thead>
                <tbody>{models.map(renderTableRow)}</tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}