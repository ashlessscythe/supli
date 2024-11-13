"use client";

import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useRequests } from "@/hooks/use-requests";
import { MoreHorizontal, CheckCircle, XCircle } from "lucide-react";
import { formatDate } from "@/lib/utils";
import { Request } from "@/types";

interface RequestsTableProps {
  data: Request[];
  isAdmin: boolean;
}

export function RequestsTable({ data, isAdmin }: RequestsTableProps) {
  const { handleUpdateStatus, isLoading } = useRequests();
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  const toggleRow = (id: string) => {
    const newExpandedRows = new Set(expandedRows);
    if (expandedRows.has(id)) {
      newExpandedRows.delete(id);
    } else {
      newExpandedRows.add(id);
    }
    setExpandedRows(newExpandedRows);
  };

  const getStatusColor = (status: Request["status"]) => {
    switch (status) {
      case "APPROVED":
        return "text-green-600";
      case "DENIED":
        return "text-red-600";
      default:
        return "text-yellow-600";
    }
  };

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Supply</TableHead>
            <TableHead>Requester</TableHead>
            <TableHead className="w-[100px] text-right">Quantity</TableHead>
            <TableHead className="w-[100px] text-right">Status</TableHead>
            <TableHead className="w-[150px]">Date</TableHead>
            {isAdmin && <TableHead className="w-[100px]">Actions</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((request) => (
            <TableRow
              key={request.id}
              className="cursor-pointer"
              onClick={() => toggleRow(request.id)}
            >
              <TableCell className="font-medium">
                {request.supply.name}
              </TableCell>
              <TableCell>{request.user.username}</TableCell>
              <TableCell className="text-right">{request.quantity}</TableCell>
              <TableCell
                className={`text-right ${getStatusColor(request.status)}`}
              >
                {request.status}
              </TableCell>
              <TableCell>{formatDate(request.createdAt)}</TableCell>
              {isAdmin && (
                <TableCell>
                  {request.status === "PENDING" && (
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        asChild
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <span className="sr-only">Open menu</span>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation();
                            handleUpdateStatus(request.id, "APPROVED");
                          }}
                          disabled={isLoading}
                          className="text-green-600"
                        >
                          <CheckCircle className="mr-2 h-4 w-4" />
                          Approve
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation();
                            handleUpdateStatus(request.id, "DENIED");
                          }}
                          disabled={isLoading}
                          className="text-red-600"
                        >
                          <XCircle className="mr-2 h-4 w-4" />
                          Deny
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
