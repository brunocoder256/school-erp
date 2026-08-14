import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is not set.");
}

const adapter = new PrismaPg({
  connectionString,
});

const prisma = new PrismaClient({
  adapter,
});

const permissions = [
  { key: "schools.read", description: "View schools" },
  { key: "schools.create", description: "Create schools" },
  { key: "schools.update", description: "Update schools" },
  { key: "schools.delete", description: "Delete schools" },

  { key: "users.read", description: "View users" },
  { key: "users.create", description: "Create users" },
  { key: "users.update", description: "Update users" },
  { key: "users.delete", description: "Deactivate or delete users" },

  { key: "memberships.read", description: "View school memberships" },
  { key: "memberships.create", description: "Add users to schools" },
  { key: "memberships.update", description: "Update school memberships" },
  { key: "memberships.delete", description: "Remove users from schools" },

  { key: "roles.read", description: "View roles" },
  { key: "roles.assign", description: "Assign roles to users" },
  { key: "roles.revoke", description: "Revoke roles from users" },

  { key: "academic_years.read", description: "View academic years" },
  { key: "academic_years.create", description: "Create academic years" },
  { key: "academic_years.update", description: "Update academic years" },

  { key: "terms.read", description: "View academic terms" },
  { key: "terms.create", description: "Create academic terms" },
  { key: "terms.update", description: "Update academic terms" },

  { key: "students.read", description: "View students" },
  { key: "students.create", description: "Create students" },
  { key: "students.update", description: "Update students" },
  { key: "students.delete", description: "Delete or deactivate students" },

  { key: "staff.read", description: "View staff" },
  { key: "staff.create", description: "Create staff records" },
  { key: "staff.update", description: "Update staff records" },
  { key: "staff.delete", description: "Delete or deactivate staff records" },

  { key: "attendance.read", description: "View attendance" },
  { key: "attendance.mark", description: "Mark attendance" },
  { key: "attendance.update", description: "Update attendance" },

  { key: "grades.read", description: "View grades" },
  { key: "grades.enter", description: "Enter grades" },
  { key: "grades.update", description: "Update grades" },
  { key: "grades.approve", description: "Approve grades" },
];

const roles = [
  {
    name: "SUPER_ADMIN",
    scope: "SYSTEM" as const,
    description: "Platform administrator with system-wide access",
  },
  {
    name: "SCHOOL_ADMIN",
    scope: "SCHOOL" as const,
    description: "Administrator for a specific school",
  },
  {
    name: "TEACHER",
    scope: "SCHOOL" as const,
    description: "Teacher within a specific school",
  },
  {
    name: "STUDENT",
    scope: "SCHOOL" as const,
    description: "Student within a specific school",
  },
  {
    name: "PARENT",
    scope: "SCHOOL" as const,
    description: "Parent or guardian within a specific school",
  },
  {
    name: "STAFF",
    scope: "SCHOOL" as const,
    description: "Non-teaching staff within a specific school",
  },
];

const rolePermissions: Record<string, string[]> = {
  SUPER_ADMIN: permissions.map((permission) => permission.key),

  SCHOOL_ADMIN: [
    "schools.read",
    "schools.update",
    "users.read",
    "users.create",
    "users.update",
    "users.delete",
    "memberships.read",
    "memberships.create",
    "memberships.update",
    "memberships.delete",
    "roles.read",
    "roles.assign",
    "roles.revoke",
    "academic_years.read",
    "academic_years.create",
    "academic_years.update",
    "terms.read",
    "terms.create",
    "terms.update",
    "students.read",
    "students.create",
    "students.update",
    "students.delete",
    "staff.read",
    "staff.create",
    "staff.update",
    "staff.delete",
    "attendance.read",
    "attendance.mark",
    "attendance.update",
    "grades.read",
    "grades.enter",
    "grades.update",
    "grades.approve",
  ],

  TEACHER: [
    "academic_years.read",
    "terms.read",
    "students.read",
    "staff.read",
    "attendance.read",
    "attendance.mark",
    "attendance.update",
    "grades.read",
    "grades.enter",
    "grades.update",
  ],

  STUDENT: [
    "academic_years.read",
    "terms.read",
    "students.read",
    "attendance.read",
    "grades.read",
  ],

  PARENT: [
    "academic_years.read",
    "terms.read",
    "students.read",
    "attendance.read",
    "grades.read",
  ],

  STAFF: [
    "academic_years.read",
    "terms.read",
    "students.read",
    "staff.read",
    "attendance.read",
    "attendance.mark",
    "attendance.update",
  ],
};

async function main() {
  console.log("Seeding permissions...");

  const permissionMap = new Map<string, string>();

  for (const permission of permissions) {
    const record = await prisma.permission.upsert({
      where: { key: permission.key },
      update: {
        description: permission.description,
      },
      create: permission,
    });

    permissionMap.set(record.key, record.id);
  }

  console.log(`Seeded ${permissionMap.size} permissions.`);

  console.log("Seeding roles...");

  const roleMap = new Map<string, string>();

  for (const role of roles) {
    const record = await prisma.role.upsert({
      where: { name: role.name },
      update: {
        scope: role.scope,
        description: role.description,
      },
      create: role,
    });

    roleMap.set(record.name, record.id);
  }

  console.log(`Seeded ${roleMap.size} roles.`);

  console.log("Seeding role permissions...");

  let assignments = 0;

  for (const [roleName, permissionKeys] of Object.entries(rolePermissions)) {
    const roleId = roleMap.get(roleName);

    if (!roleId) {
      throw new Error(`Role "${roleName}" was not found.`);
    }

    for (const permissionKey of permissionKeys) {
      const permissionId = permissionMap.get(permissionKey);

      if (!permissionId) {
        throw new Error(
          `Permission "${permissionKey}" required by "${roleName}" was not found.`,
        );
      }

      await prisma.rolePermission.upsert({
        where: {
          roleId_permissionId: {
            roleId,
            permissionId,
          },
        },
        update: {},
        create: {
          roleId,
          permissionId,
        },
      });

      assignments++;
    }
  }

  console.log(`Created/verified ${assignments} role-permission assignments.`);
  console.log("Seed completed successfully.");
}

main()
  .catch((error) => {
    console.error("Seed failed:");
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });