import React from "react";

export default function Groups() {
  return (
    <div className="space-y-4">
      <h1 className="text-3xl font-bold">Groups</h1>
      <p className="text-gray-600">
        Groups backend endpoints are available now (/api/groups, /api/members).  
        Next step: wire this page to join/leave groups using member.group.
      </p>
    </div>
  );
}
