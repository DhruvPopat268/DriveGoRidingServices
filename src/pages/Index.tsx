import { useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { Routes, Route } from "react-router-dom";
import { Sidebar } from "@/components/admin/Sidebar";
import { Header } from "@/components/admin/Header";
import { DashboardStats } from "@/components/admin/DashboardStats";
import { RecentRides } from "@/components/admin/RecentRides";
import { BookedRides } from "@/components/admin/BookedRides";
import { ConfirmedRides } from "@/components/admin/ConfirmedRides";
import { RevenueChart } from "@/components/admin/RevenueChart";
import { RideStatusChart } from "@/components/admin/RideStatusChart";
import { RevenueDistributionChart } from "@/components/admin/RevenueDistributionChart";
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
import ReferEarnPage from "@/components/admin/pages/ReferEarnPage";
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
import NotFound from "@/pages/NotFound";

// Dashboard
const Dashboard = () => (
  <div className="space-y-6">
    <DashboardStats />
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <RevenueChart />
      <RideStatusChart />
      <RevenueDistributionChart />
    </div>
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <BookedRides />
      <ConfirmedRides />
    </div>
  </div>
);

const Index = () => {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <div className="min-h-screen bg-background text-foreground flex">
      <Sidebar isOpen={sidebarOpen} />
      <div className={`flex-1 transition-all duration-300 ${sidebarOpen ? 'ml-64' : 'ml-16'}`}>
        <Header onToggleSidebar={() => setSidebarOpen(!sidebarOpen)} />
        <main className="p-6">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/dashboard" element={<Dashboard />} />

            {/* Rides */}
            <Route path="/rides" element={<RidesPage />} />
            <Route path="/rides/:rideId" element={<RideDetailsPage />} />
            <Route path="/all-rides" element={<AllRidesPage />} />
            <Route path="/all-rides/:rideId" element={<RideDetailsPage />} />

            {/* Drivers */}
            <Route path="/drivers" element={<AllDriversPage />} />
            <Route path="/drivers/:driverId" element={<DriverDetailPage />} />
            <Route path="/drivers/:driverId/logs" element={<DriverOnlineLogsPage />} />
            <Route path="/suspend-driver" element={<SuspendDriverPage />} />

            {/* Driver Wallet & Payments */}
            <Route path="/driver-transactions" element={<DriverTransactionsPage />} />
            <Route path="/pending-withdrawals" element={<PendingWithdrawalPage />} />
            <Route path="/completed-withdrawals" element={<CompletedWithdrawalPage />} />
            <Route path="/rejected-withdrawals" element={<RejectedWithdrawalPage />} />
            <Route path="/driver-purchased-plans" element={<DriverPurchasedPlansPage />} />
            <Route path="/min-withdraw-balance" element={<MinWithdrawBalancePage />} />
            <Route path="/service-wallet-balance" element={<ServiceWiseMinWalletPage />} />
            <Route path="/driver-incentives" element={<DriverIncentivePage />} />

            {/* Driver Credits */}
            <Route path="/all-drivers-credits" element={<AllDriversCreditsPage />} />
            <Route path="/manage-driver-credits" element={<ManageDriverCreditsPage />} />

            {/* Users */}
            <Route path="/users" element={<UsersPage />} />
            <Route path="/users/:riderId" element={<RiderDetailPage />} />
            <Route path="/rider-pending-withdrawals" element={<RiderPendingWithdrawalPage />} />
            <Route path="/rider-approved-withdrawals" element={<RiderApprovedWithdrawalPage />} />
            <Route path="/rider-rejected-withdrawals" element={<RiderRejectedWithdrawalPage />} />
            <Route path="/rider-wallet-config" element={<RiderWalletConfigPage />} />

            {/* Vehicles */}
            <Route path="/approved-vehicles" element={<ApprovedVehiclesPage />} />

            {/* Categories */}
            <Route path="/category" element={<CategoryPage />} />
            <Route path="/subcategory" element={<SubCategoryPage />} />
            <Route path="/subsubcategory" element={<SubSubCategoryPage />} />
            <Route path="/vehiclecategory" element={<VehicleCategoryPage />} />
            <Route path="/drivervehicletype" element={<DriverVehicleTypePage />} />
            <Route path="/drivercategory" element={<PriceCategoryPage />} />
            <Route path="/parcelcategory" element={<ParcelCategoryPage />} />
            <Route path="/parcelvehicletype" element={<ParcelVehicleTypePage />} />
            <Route path="/parcelvehicleManagement" element={<ParcelVehicleManagementPage />} />
            <Route path="/parcelridecost" element={<ParcelRideCostPage />} />
            <Route path="/DriverRidecost" element={<DriverRideCostPage />} />
            <Route path="/carcategory" element={<CarCategoryPage />} />
            <Route path="/vehicletype" element={<VehicleTypePage />} />
            <Route path="/carmanagement" element={<CarManagementPage />} />
            <Route path="/cabridecost" element={<CabRideCostPage />} />

            {/* Category Assignment */}
            <Route path="/admin/category-assignment/:categoryType/:categoryId" element={<UniversalCategoryAssignmentPage />} />

            {/* Location */}
            <Route path="/states" element={<StatesPage />} />
            <Route path="/cities" element={<CitiesPage />} />

            {/* Ratings */}
            <Route path="/user-ratings" element={<UserRatingsPage />} />
            <Route path="/driver-ratings" element={<DriverRatingsPage />} />

            {/* Other */}
            <Route path="/peakhours" element={<PeakHoursPage />} />
            <Route path="/t&c" element={<InstructionsPage />} />
            <Route path="/UserReferearn" element={<ReferEarnPage />} />
            <Route path="/rolemanagement" element={<RBACManagementPage />} />
            <Route path="/driversubscription" element={<DriverSubscriptionPage />} />
            <Route path="/admin-wallet-ledger" element={<AdminWalletLedger />} />
            <Route path="/create-offline-staff" element={<OfflineStaffPage />} />
            <Route path="/file-upload-test" element={<FileUploadTest />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </main>
      </div>
    </div>
  );
};

export default Index;
