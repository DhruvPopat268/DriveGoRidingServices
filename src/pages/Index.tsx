
import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Sidebar } from "@/components/admin/Sidebar";
import { Header } from "@/components/admin/Header";
import { DashboardStats } from "@/components/admin/DashboardStats";
import { RecentRides } from "@/components/admin/RecentRides";
import { BookedRides } from "@/components/admin/BookedRides";
import { ConfirmedRides } from "@/components/admin/ConfirmedRides";
import { DriverRequests } from "@/components/admin/DriverRequests";
import { RevenueChart } from "@/components/admin/RevenueChart";
import { RideStatusChart } from "@/components/admin/RideStatusChart";
import { RevenueDistributionChart } from "@/components/admin/RevenueDistributionChart";
import { LiveMap } from "@/components/admin/LiveMap";
import { RidersPage } from "@/components/admin/pages/RidersPage";
import { RidesPage } from "@/components/admin/pages/RidesPage";
import { AllRidesPage } from "@/components/admin/pages/AllRidesPage";
import { CategoryPage } from "@/components/admin/pages/CategoryPage";
import { SubCategoryPage } from "@/components/admin/pages/SubCategoryPage";
import { SubSubCategoryPage } from "@/components/admin/pages/SubSubCategoryPage";
import { VehicleCategoryPage } from "@/components/admin/pages/VehicleCategoryPage";
import { DriverVehicleTypePage } from "@/components/admin/pages/DriverVehicleTypePage";
import { PriceCategoryPage } from "@/components/admin/pages/PriceCategoryPage";
import { DriverRideCostPage } from "@/components/admin/pages/DriverRideCostPage";
import { CabRideCostPage } from "@/components/admin/pages/CabRideCostPage";
import { PeakHoursPage } from "@/components/admin/pages/PeakHoursPage";
import { PaymentsPage } from "@/components/admin/pages/PaymentsPage";
import { AnalyticsPage } from "@/components/admin/pages/AnalyticsPage";
import { SupportPage } from "@/components/admin/pages/SupportPage";
import { NotificationsPage } from "@/components/admin/pages/NotificationsPage";
import { SafetyPage } from "@/components/admin/pages/SafetyPage";
import { SettingsPage } from "@/components/admin/pages/SettingsPage";
import { InstructionsPage } from "@/components/admin/pages/InstructionsPage";
import  ReferEarnPage  from "@/components/admin/pages/ReferEarnPage";
import { StatesPage } from "@/components/admin/pages/StatesPage";
import { CitiesPage } from "@/components/admin/pages/CitiesPage";
import { CarCategoryPage } from "@/components/admin/pages/CarCategoryPage";
import { VehicleTypePage } from "@/components/admin/pages/VehicleTypePage";
import { CarManagementPage } from "@/components/admin/pages/CarManagementPage";
import { ParcelCategoryPage } from "@/components/admin/pages/ParcelCategoryPage";
import ParcelVehicleTypePage from "@/components/admin/pages/ParcelVehicleTypePage";
import { ParcelVehicleManagementPage } from "@/components/admin/pages/ParcelVehicleManagementPage";
import { ParcelRideCostPage } from "@/components/admin/pages/ParcelRideCostPage";
import { DriverSubscriptionPage } from "@/components/admin/pages/DriverSubscriptionPage";
import { AllDriversPage } from "@/components/admin/pages/AllDriversPage";
import { DriverDetailPage } from "@/components/admin/pages/DriverDetailPage";
import { DriverOnlineLogsPage } from "@/components/admin/pages/DriverOnlineLogsPage";
import { DriverTransactionsPage } from "@/components/admin/pages/DriverTransactionsPage";
import { RBACManagementPage } from "@/components/admin/pages/RBACManagementPage";
import { PendingWithdrawalPage } from "@/components/admin/pages/PendingWithdrawalPage";
import { CompletedWithdrawalPage } from "@/components/admin/pages/CompletedWithdrawalPage";
import { RejectedWithdrawalPage } from "@/components/admin/pages/RejectedWithdrawalPage";
import { DriverPurchasedPlansPage } from "@/components/admin/pages/DriverPurchasedPlansPage";
import { RideDetailsPage } from "@/components/admin/pages/RideDetailsPage";

import FileUploadTest from "@/components/admin/pages/FileUploadTest";
import { AllDriversCreditsPage } from "@/components/admin/pages/AllDriversCreditsPage";
import { ManageDriverCreditsPage } from "@/components/admin/pages/ManageDriverCreditsPage";
import MinWithdrawBalancePage from "@/components/admin/pages/MinWithdrawBalancePage";
import { ServiceWiseMinWalletPage } from "@/components/admin/pages/ServiceWiseMinWalletPage";
import { UniversalCategoryAssignmentPage } from "@/components/admin/pages/UniversalCategoryAssignmentPage";
import UserRatingsPage from "@/components/admin/pages/UserRatingsPage";
import DriverRatingsPage from "@/components/admin/pages/DriverRatingsPage";
import DriverIncentivePage from "@/components/admin/pages/DriverIncentivePage";
import SuspendDriverPage from "@/components/admin/pages/SuspendDriverPage";
import { UsersPage } from "@/components/admin/pages/UsersPage";
import { RiderDetailPage } from "@/components/admin/pages/RiderDetailPage";
import ApprovedVehiclesPage from "@/components/admin/pages/ApprovedVehiclesPage";
import RiderPendingWithdrawalPage from "@/components/admin/pages/RiderPendingWithdrawalPage";
import RiderApprovedWithdrawalPage from "@/components/admin/pages/RiderApprovedWithdrawalPage";
import RiderRejectedWithdrawalPage from "@/components/admin/pages/RiderRejectedWithdrawalPage";
import RiderWalletConfigPage from "@/components/admin/pages/RiderWalletConfigPage";
import AdminWalletLedger from "@/components/admin/pages/AdminWalletLedger";
import { OfflineStaffPage } from "@/components/admin/pages/OfflineStaffPage";
import axios from "axios";

const Index = () => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeSection, setActiveSection] = useState("");
  const [selectedDriverId, setSelectedDriverId] = useState<string | null>(null);
  const [selectedDriverLogsId, setSelectedDriverLogsId] = useState<string | null>(null);
  const [selectedDriverTransactionsId, setSelectedDriverTransactionsId] = useState<string | null>(null);
  const [selectedRideId, setSelectedRideId] = useState<string | null>(null);
  const [selectedRiderId, setSelectedRiderId] = useState<string | null>(null);
  const [categoryAssignment, setCategoryAssignment] = useState<{categoryType: string, categoryId: string, categoryName: string} | null>(null);

  const handleSectionChange = (section: string) => {
    setSelectedDriverId(null);
    setSelectedDriverLogsId(null);
    setSelectedDriverTransactionsId(null);
    setSelectedRideId(null);
    setSelectedRiderId(null);
    setActiveSection(section);
    
    // Clear URL parameters
    const url = new URL(window.location.href);
    url.searchParams.delete('section');
    url.searchParams.delete('rideId');
    
    // Update URL for specific sections
    if (section === 'dashboard') {
      navigate('/');
    } else {
      // For other sections, just update the URL without parameters
      window.history.replaceState({}, '', url.pathname);
    }
  };
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const path = location.pathname;
    const urlParams = new URLSearchParams(location.search);
    const section = urlParams.get('section');
    const rideId = urlParams.get('rideId');
    
    // Handle URL parameters for navigation
    if (section && rideId) {
      setActiveSection(section);
      setSelectedRideId(rideId);
      return;
    }
    
    // Handle direct URL navigation
    const match = path.match(/\/admin\/category-assignment\/(\w+)\/([a-f0-9]+)/);
    if (match) {
      const [, categoryType, categoryId] = match;
      fetchCategoryAndSet(categoryType, categoryId);
      setActiveSection('category-assignment');
    } else if (!activeSection) {
      setActiveSection("dashboard");
    }
  }, [location.pathname, location.search]);

  const fetchCategoryAndSet = async (categoryType: string, categoryId: string) => {
    try {
      let endpoint = '';
      let nameField = '';
      
      switch (categoryType) {
        case 'parcel':
          endpoint = `/api/parcelVehicles/${categoryId}`;
          nameField = 'name';
          break;
        case 'driver':
          endpoint = `/api/price-categories/${categoryId}`;
          nameField = 'priceCategoryName';
          break;
        case 'car':
          endpoint = `/api/cars/${categoryId}`;
          nameField = 'name';
          break;
      }
      
      const response = await axios.get(`${import.meta.env.VITE_API_URL}${endpoint}`);
      setCategoryAssignment({
        categoryType,
        categoryId,
        categoryName: response.data[nameField]
      });
    } catch (err) {
      console.error('Failed to fetch category:', err);
      navigate('/');
    }
  };


  const renderContent = () => {
    switch (activeSection) {
      case "dashboard":
        return (
          <div className="space-y-6">
            <DashboardStats />
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div>
                <RevenueChart />
              </div>
              <div>
                <RideStatusChart />
              </div>
              <div>
                <RevenueDistributionChart />
              </div>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div>
                <BookedRides />
              </div>
              <div>
                <ConfirmedRides />
              </div>
            </div>
          </div>
        );
      case "states":
        return <StatesPage />;
      case "cities":
        return <CitiesPage />;
      case "riders":
        return <RidersPage />;
      case "rides":
        return selectedRideId ? (
          <RideDetailsPage 
            rideId={selectedRideId} 
            onBack={() => setSelectedRideId(null)} 
          />
        ) : (
          <RidesPage 
            onNavigateToDetail={(rideId) => setSelectedRideId(rideId)} 
          />
        );
      case "all-rides":
        return selectedRideId ? (
          <RideDetailsPage 
            rideId={selectedRideId} 
            onBack={() => setSelectedRideId(null)} 
          />
        ) : selectedDriverId ? (
          <DriverDetailPage
            driverId={selectedDriverId}
            onBack={() => setSelectedDriverId(null)}
            onNavigateToRideDetail={(rideId) => setSelectedRideId(rideId)}
          />
        ) : selectedRiderId ? (
          <RiderDetailPage
            riderId={selectedRiderId}
            onBack={() => setSelectedRiderId(null)}
            onNavigateToRideDetail={(rideId) => setSelectedRideId(rideId)}
          />
        ) : (
          <AllRidesPage 
            onNavigateToDetail={(rideId) => setSelectedRideId(rideId)}
            onNavigateToRiderDetail={(riderId) => setSelectedRiderId(riderId)}
            onNavigateToDriverDetail={(driverId) => setSelectedDriverId(driverId)}
          />
        );
      case "category":
        return <CategoryPage />;
      case "subcategory":
        return <SubCategoryPage />;
      case "subsubcategory":
        return <SubSubCategoryPage />;
      case "vehiclecategory":
        return <VehicleCategoryPage />;
      case "drivervehicletype":
        return <DriverVehicleTypePage />;
      case "drivercategory":
        return <PriceCategoryPage />;
      case "parcelcategory":
        return <ParcelCategoryPage />;
      case "parcelvehicletype":
        return <ParcelVehicleTypePage />;
      case "parcelvehicleManagement":
        return <ParcelVehicleManagementPage />;
      case "parcelridecost":
        return <ParcelRideCostPage />;
      case "DriverRidecost":
        return <DriverRideCostPage />;  
      case "cabridecost":
        return <CabRideCostPage />;
      case "peakhours":
        return <PeakHoursPage />;
      case "t&c":
        return <InstructionsPage />;
      case "payments":
        return <PaymentsPage />;
      case "analytics":
        return <AnalyticsPage />;
      case "support":
        return <SupportPage />;
      case "notifications":
        return <NotificationsPage />;
      case "safety":
        return <SafetyPage />;
      case "settings":
        return <SettingsPage />;
      case "UserReferearn":
        return <ReferEarnPage />;
      case "rbac":
        return <RBACManagementPage />;
      case "rolemanagement":
        return <RBACManagementPage />;
      case "carcategory":
        return <CarCategoryPage />;
      case "vehicletype":
        return <VehicleTypePage />;
      case "carmanagement":
        return <CarManagementPage />;
      case "cabridecost":
        return <CabRideCostPage />;
      case "driversubscription":
        return <DriverSubscriptionPage />;
      case "payments":
        return <PaymentsPage />;
      case "riders":
        return <RidersPage />;
      case "support":
        return <SupportPage />;
      case "drivers-all":
        return selectedRideId ? (
          <RideDetailsPage 
            rideId={selectedRideId} 
            onBack={() => setSelectedRideId(null)} 
          />
        ) : selectedDriverLogsId ? (
          <DriverOnlineLogsPage
            driverId={selectedDriverLogsId}
            onBack={() => setSelectedDriverLogsId(null)}
          />
        ) : selectedDriverId ? (
          <DriverDetailPage 
            driverId={selectedDriverId} 
            onBack={() => setSelectedDriverId(null)}
            onNavigateToRideDetail={(rideId) => setSelectedRideId(rideId)}
          />
        ) : (
          <AllDriversPage 
            onNavigateToDetail={(driverId) => setSelectedDriverId(driverId)}
            onNavigateToLogs={(driverId) => setSelectedDriverLogsId(driverId)}
            onNavigateToWalletHistory={(driverId) => {
              setSelectedDriverTransactionsId(driverId);
              setActiveSection("driver-transactions");
            }}
          />
        );
      case "pending-withdrawals":
        return <PendingWithdrawalPage />;
      case "completed-withdrawals":
        return <CompletedWithdrawalPage />;
      case "rejected-withdrawals":
        return <RejectedWithdrawalPage />;
      case "driver-transactions":
        return <DriverTransactionsPage
          preselectedDriverId={selectedDriverTransactionsId || undefined}
          onBack={selectedDriverTransactionsId ? () => {
            setSelectedDriverTransactionsId(null);
            setActiveSection("drivers-all");
          } : undefined}
        />;
      case "driver-purchased-plans":
        return <DriverPurchasedPlansPage />;
      case "all-drivers-credits":
        return <AllDriversCreditsPage />;
      case "manage-driver-credits":
        return <ManageDriverCreditsPage />;
      case "min-withdraw-balance":
        return <MinWithdrawBalancePage />;
      case "service-wallet-balance":
        return <ServiceWiseMinWalletPage />;
      case "user-ratings":
        return selectedRideId ? (
          <RideDetailsPage 
            rideId={selectedRideId} 
            onBack={() => setSelectedRideId(null)} 
          />
        ) : (
          <UserRatingsPage 
            onNavigateToRideDetail={(rideId) => setSelectedRideId(rideId)} 
          />
        );
      case "driver-ratings":
        return selectedRideId ? (
          <RideDetailsPage 
            rideId={selectedRideId} 
            onBack={() => setSelectedRideId(null)} 
          />
        ) : (
          <DriverRatingsPage 
            onNavigateToRideDetail={(rideId) => setSelectedRideId(rideId)} 
          />
        );
      case "file-upload-test":
        return <FileUploadTest />;
      case "driver-incentives":
        return <DriverIncentivePage />;
      case "suspend-driver":
        return <SuspendDriverPage />;
      case "users":
        return selectedRideId ? (
          <RideDetailsPage 
            rideId={selectedRideId} 
            onBack={() => setSelectedRideId(null)} 
          />
        ) : selectedRiderId ? (
          <RiderDetailPage 
            riderId={selectedRiderId} 
            onBack={() => setSelectedRiderId(null)}
            onNavigateToRideDetail={(rideId) => setSelectedRideId(rideId)}
          />
        ) : (
          <UsersPage 
            onNavigateToRiderDetail={(riderId) => setSelectedRiderId(riderId)} 
          />
        );
      case "approved-vehicles":
        return <ApprovedVehiclesPage onNavigateToDriverDetail={(driverId) => { setSelectedDriverId(driverId); setActiveSection('drivers-all'); }} />;
      case "rider-pending-withdrawals":
        return <RiderPendingWithdrawalPage />;
      case "rider-approved-withdrawals":
        return <RiderApprovedWithdrawalPage />;
      case "rider-rejected-withdrawals":
        return <RiderRejectedWithdrawalPage />;
      case "rider-wallet-config":
        return <RiderWalletConfigPage />;
      case "create-offline-staff":
      case "manage-offline-staff":
        return <OfflineStaffPage />;
      case "admin-wallet-ledger":
        return <AdminWalletLedger />;

      case "category-assignment":
        return categoryAssignment ? (
          <UniversalCategoryAssignmentPage 
            categoryType={categoryAssignment.categoryType}
            categoryId={categoryAssignment.categoryId}
            categoryName={categoryAssignment.categoryName}
            isCarAssignment={categoryAssignment.categoryType === 'car'}
            onBack={() => {
              setCategoryAssignment(null);
              setActiveSection('dashboard');
              navigate('/');
            }}
          />
        ) : null;
      default:
        return <div className="text-white dark:text-white text-gray-900">Page not found</div>;
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex">
      <Sidebar
        isOpen={sidebarOpen}
        activeSection={activeSection}
        onSectionChange={handleSectionChange}
      />
      <div className={`flex-1 transition-all duration-300 ${sidebarOpen ? 'ml-64' : 'ml-16'}`}>
        <Header onToggleSidebar={() => setSidebarOpen(!sidebarOpen)} />
        <main className="p-6">
          {renderContent()}
        </main>
      </div>
    </div>
  );
};

export default Index;