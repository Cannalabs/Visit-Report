import React, { useState, useEffect } from "react";
import { ShopVisit } from "@/api/entities";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { motion } from "framer-motion";
import {
  Camera,
  Search,
  Calendar,
  MapPin,
  FileText,
  ArrowLeft
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

export default function VisitSelector() {
  const navigate = useNavigate();
  const [visits, setVisits] = useState([]);
  const [filteredVisits, setFilteredVisits] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    loadVisits();
  }, []);

  useEffect(() => {
    if (searchTerm) {
      const filtered = visits.filter(visit =>
        visit.shop_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        visit.shop_address?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        visit.contact_person?.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredVisits(filtered);
    } else {
      setFilteredVisits(visits);
    }
  }, [searchTerm, visits]);

  const loadVisits = async () => {
    try {
      const data = await ShopVisit.list("-created_date", 50); // Get recent 50 visits
      setVisits(data);
      setFilteredVisits(data);
    } catch (error) {
      console.error("Error loading visits:", error);
    }
    setIsLoading(false);
  };

  const handleSelectVisit = (visitId) => {
    // Navigate to NewVisit with the visit ID and jump to photos section (section 4)
    navigate(`${createPageUrl("NewVisit")}?id=${visitId}&section=4`);
  };

  return (
    <div className="p-4 md:p-8 bg-gray-50 min-h-screen">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-4"
        >
          <Button
            variant="outline"
            size="icon"
            onClick={() => navigate(createPageUrl("Dashboard"))}
            className="border-green-200 hover:bg-green-50"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-gray-900">Select Visit for Photos</h1>
            <p className="text-gray-600 mt-2">
              Choose a visit report to add or view photos
            </p>
          </div>
        </motion.div>

        {/* Search */}
        <Card>
          <CardContent className="p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Search by shop name, address, or contact..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardContent>
        </Card>

        {/* Visits List */}
        {isLoading ? (
          <div className="flex justify-center items-center py-12">
            <div className="w-8 h-8 border-2 border-green-600 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : filteredVisits.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <Camera className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-600 text-lg">No visits found</p>
              <p className="text-gray-500 text-sm mt-2">
                {searchTerm ? "Try a different search term" : "Create a visit report first"}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {filteredVisits.map((visit, index) => (
              <motion.div
                key={visit.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card className="hover:shadow-lg transition-shadow cursor-pointer"
                      onClick={() => handleSelectVisit(visit.id)}>
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-semibold text-gray-900">
                            {visit.shop_name || "Unnamed Shop"}
                          </h3>
                          {visit.is_draft && (
                            <Badge variant="outline" className="border-orange-300 text-orange-700">
                              Draft
                            </Badge>
                          )}
                          {visit.is_draft === false && (
                            <Badge variant="outline" className="border-green-300 text-green-700">
                              Submitted
                            </Badge>
                          )}
                        </div>
                        <div className="space-y-1 text-sm text-gray-600">
                          {visit.shop_address && (
                            <div className="flex items-center gap-2">
                              <MapPin className="w-4 h-4" />
                              <span>{visit.shop_address}</span>
                            </div>
                          )}
                          {visit.contact_person && (
                            <div className="flex items-center gap-2">
                              <span>Contact: {visit.contact_person}</span>
                            </div>
                          )}
                          {visit.visit_date && (
                            <div className="flex items-center gap-2">
                              <Calendar className="w-4 h-4" />
                              <span>
                                {format(new Date(visit.visit_date), "MMM dd, yyyy")}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSelectVisit(visit.id);
                          }}
                          className="bg-blue-600 hover:bg-blue-700"
                        >
                          <Camera className="w-4 h-4 mr-2" />
                          Add Photos
                        </Button>
                      </div>
                    </div>
                    {visit.visit_photos && visit.visit_photos.length > 0 && (
                      <div className="mt-4 pt-4 border-t border-gray-200">
                        <p className="text-sm text-gray-600">
                          {visit.visit_photos.length} photo{visit.visit_photos.length !== 1 ? 's' : ''} already attached
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

