# Region Management Interface Documentation

## Overview

The Region Management interface provides a complete CRUD (Create, Read, Update, Delete) system for managing regions in your application. It's located at `/branchManagement/region` as defined in the sidebar configuration.

## File Structure

```
app/
├── pages/
│   └── branchManagement/
│       └── region.vue                 # Main page with table
├── components/
│   └── region/
│       ├── AddModal.vue              # Add region modal
│       ├── UpdateModal.vue           # Update region modal
│       └── DeleteModal.vue           # Delete region modal
server/
└── api/
    ├── regions.ts                    # GET all, POST new region
    └── regions/
        └── [id].ts                   # GET, PUT, DELETE single region
```

## Features

### 1. **View Regions (Table)**

- Displays all regions in a paginated table
- Columns: NO (auto-numbered), Region Name, Actions
- Search/filter functionality
- Sortable columns
- Pagination controls

### 2. **Add Region**

- Click "Add Region" button in the navbar
- Modal form with validation (minimum 2 characters)
- Real-time error handling
- Success/error toast notifications

### 3. **Update Region**

- Click the ellipsis menu (⋮) in the Actions column
- Select "Edit Region"
- Modal pre-filled with current data
- Form validation
- Success/error toast notifications

### 4. **Delete Region**

- Click the ellipsis menu (⋮) in the Actions column
- Select "Delete Region"
- Confirmation dialog with region name
- Success/error toast notifications

## API Integration

### Current Implementation (Mock Data)

The interface currently uses mock API endpoints for demonstration. The mock data is defined in:

- `server/api/regions.ts` - List and create operations
- `server/api/regions/[id].ts` - Individual region operations

### Integrating with Your Backend

To connect this interface to your real backend, follow these steps:

#### Option 1: Replace Mock API Files

**Step 1: Update `server/api/regions.ts`**

```typescript
export default defineEventHandler(async (event) => {
  const method = event.method;

  // GET - Fetch all regions
  if (method === "GET") {
    // Replace with your database query
    const regions = await db.regions.findMany({
      orderBy: { createdAt: "desc" },
    });
    return regions;
  }

  // POST - Create new region
  if (method === "POST") {
    const body = await readBody(event);

    // Validate input
    if (!body.name || body.name.trim().length < 2) {
      throw createError({
        statusCode: 400,
        statusMessage: "Region name must be at least 2 characters",
      });
    }

    // Check for duplicates
    const existing = await db.regions.findFirst({
      where: { name: body.name },
    });

    if (existing) {
      throw createError({
        statusCode: 409,
        statusMessage: "Region with this name already exists",
      });
    }

    // Create region
    const newRegion = await db.regions.create({
      data: { name: body.name },
    });

    return {
      success: true,
      data: newRegion,
      message: "Region created successfully",
    };
  }

  throw createError({
    statusCode: 405,
    statusMessage: "Method not allowed",
  });
});
```

**Step 2: Update `server/api/regions/[id].ts`**

```typescript
export default defineEventHandler(async (event) => {
  const method = event.method;
  const regionId = parseInt(event.context.params?.id || "0");

  if (!regionId) {
    throw createError({
      statusCode: 400,
      statusMessage: "Region ID is required",
    });
  }

  // GET - Fetch single region
  if (method === "GET") {
    const region = await db.regions.findUnique({
      where: { id: regionId },
    });

    if (!region) {
      throw createError({
        statusCode: 404,
        statusMessage: "Region not found",
      });
    }

    return region;
  }

  // PUT/PATCH - Update region
  if (method === "PUT" || method === "PATCH") {
    const body = await readBody(event);

    // Validate input
    if (!body.name || body.name.trim().length < 2) {
      throw createError({
        statusCode: 400,
        statusMessage: "Region name must be at least 2 characters",
      });
    }

    // Check for duplicates (excluding current region)
    const existing = await db.regions.findFirst({
      where: {
        name: body.name,
        NOT: { id: regionId },
      },
    });

    if (existing) {
      throw createError({
        statusCode: 409,
        statusMessage: "Region with this name already exists",
      });
    }

    // Update region
    const updatedRegion = await db.regions.update({
      where: { id: regionId },
      data: { name: body.name },
    });

    return {
      success: true,
      data: updatedRegion,
      message: "Region updated successfully",
    };
  }

  // DELETE - Delete region
  if (method === "DELETE") {
    // Check for dependencies (e.g., branches)
    const branchCount = await db.branches.count({
      where: { regionId },
    });

    if (branchCount > 0) {
      throw createError({
        statusCode: 409,
        statusMessage: "Cannot delete region with existing branches",
      });
    }

    // Delete region
    const deletedRegion = await db.regions.delete({
      where: { id: regionId },
    });

    return {
      success: true,
      data: deletedRegion,
      message: "Region deleted successfully",
    };
  }

  throw createError({
    statusCode: 405,
    statusMessage: "Method not allowed",
  });
});
```

#### Option 2: Use External API

If your backend is external (not Nuxt server routes), update the modal components:

**In `app/components/region/AddModal.vue`:**

```typescript
// Replace the $fetch call
await $fetch("https://your-api.com/api/regions", {
  method: "POST",
  headers: {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  },
  body: { name: event.data.name },
});
```

**In `app/components/region/UpdateModal.vue`:**

```typescript
await $fetch(`https://your-api.com/api/regions/${props.region.id}`, {
  method: "PUT",
  headers: {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  },
  body: { name: event.data.name },
});
```

**In `app/components/region/DeleteModal.vue`:**

```typescript
await $fetch(`https://your-api.com/api/regions/${props.region.id}`, {
  method: "DELETE",
  headers: {
    Authorization: `Bearer ${token}`,
  },
});
```

**In `app/pages/branchManagement/region.vue`:**

```typescript
const { data, status, refresh } = await useFetch(
  "https://your-api.com/api/regions",
  {
    lazy: true,
    headers: {
      Authorization: `Bearer ${token}`,
    },
  },
);
```

## Data Structure

### Region Interface

```typescript
interface Region {
  id: number;
  name: string;
  createdAt?: string;
}
```

### API Response Format

**Success Response:**

```json
{
  "success": true,
  "data": {
    "id": 1,
    "name": "Jakarta Region",
    "createdAt": "2024-01-15T10:00:00Z"
  },
  "message": "Operation successful"
}
```

**Error Response:**

```json
{
  "statusCode": 400,
  "statusMessage": "Region name must be at least 2 characters"
}
```

## Validation Rules

- **Region Name**: Minimum 2 characters, required
- **Duplicate Check**: Region names must be unique (case-insensitive)
- **Delete Protection**: Cannot delete regions with associated branches (implement in your backend)

## UI Components Used

- **UTable**: Tanstack Table with pagination
- **UModal**: Modal dialogs
- **UForm**: Form with Zod validation
- **UInput**: Text input fields
- **UButton**: Action buttons
- **UDropdownMenu**: Action menu
- **UPagination**: Pagination controls
- **Toast Notifications**: Success/error feedback

## Customization

### Adding More Fields

To add additional fields (e.g., description, code):

1. Update the Region interface
2. Add fields to the modal forms
3. Update the table columns
4. Modify the API endpoints

### Changing Table Layout

Edit `app/pages/branchManagement/region.vue`:

- Modify the `columns` array to add/remove columns
- Adjust the `ui` prop for styling

### Custom Validation

Edit the modal components and update the Zod schema:

```typescript
const schema = z.object({
  name: z.string().min(2).max(100),
  code: z.string().regex(/^[A-Z]{3}$/),
  // Add more fields
});
```

## Testing

1. **Navigate to**: `/branchManagement/region`
2. **Test Add**: Click "Add Region", fill form, submit
3. **Test Update**: Click action menu, select "Edit Region", modify, submit
4. **Test Delete**: Click action menu, select "Delete Region", confirm
5. **Test Search**: Use search box to filter regions
6. **Test Pagination**: Navigate through pages

## Troubleshooting

### Issue: API calls not working

- Check network tab in browser DevTools
- Verify API endpoint URLs
- Check authentication headers if required

### Issue: Table not updating after operations

- Ensure `refresh()` is called after successful operations
- Check that events are properly emitted from modals

### Issue: Validation errors

- Review Zod schema in modal components
- Check backend validation rules match frontend

## Next Steps

1. Replace mock API with real database integration
2. Add authentication/authorization
3. Implement audit logging
4. Add export functionality (CSV, Excel)
5. Add bulk operations (delete multiple regions)
6. Implement advanced filtering and sorting

## Support

For questions or issues, please refer to:

- Nuxt UI Documentation: https://ui.nuxt.com
- Tanstack Table: https://tanstack.com/table
- Zod Validation: https://zod.dev
