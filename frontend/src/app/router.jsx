import { useEffect } from "react";
import { HashRouter, Routes, Route, Navigate } from "react-router-dom";
import Login from "../pages/auth/Login";
import Dashboard from "../pages/dashboard/Dashboard";
// import ListInvoices from "../pages/invoices/ListInvoices";
// import AddInvoice from "../pages/invoices/AddInvoice";
// import UpdateInvoice from "../pages/invoices/UpdateInvoice";
import ListRooms from "../pages/rooms/ListRooms";
import AddRoom from "../pages/rooms/AddRoom";
import UpdateRoom from "../pages/rooms/UpdateRoom";
import ListCustomers from "../pages/customers/ListCustomers";
import AddCustomer from "../pages/customers/AddCustomer";
import UpdateCustomer from "../pages/customers/UpdateCustomer";
import ListAllocations from "../pages/allocations/ListAllocations";
import AddAllocation from "../pages/allocations/AddAllocation";
import UpdateAllocation from "../pages/allocations/UpdateAllocation";
import UserManagement from "../pages/user/UserManagement";
import Reports from "../pages/reports/Reports";
// import ListItems from "../pages/items/ListItems";
// import AddItem from "../pages/items/AddItem";
// import UpdateItem from "../pages/items/UpdateItem";

function LogoutRedirect() {
  useEffect(() => {
    localStorage.removeItem("authToken");
    sessionStorage.clear();
  }, []);

  return <Navigate to="/" replace />;
}

export default function AppRouter() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/logout" element={<LogoutRedirect />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/rooms" element={<ListRooms />} />
        <Route path="/rooms/add" element={<AddRoom />} />
        <Route path="/rooms/:roomId" element={<UpdateRoom />} />
        <Route path="/customers" element={<ListCustomers />} />
        <Route path="/customers/add" element={<AddCustomer />} />
        <Route
          path="/customers/:customerId/edit"
          element={<UpdateCustomer />}
        />
        <Route path="/allocations" element={<ListAllocations />} />
        <Route path="/allocations/add" element={<AddAllocation />} />
        <Route
          path="/allocations/:allocationId"
          element={<UpdateAllocation />}
        />
        <Route path="/user-management" element={<UserManagement />} />
        <Route path="/reports" element={<Reports />} />
      </Routes>
    </HashRouter>
  );
}
