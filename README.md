
  # Craft E-commerce Frontend

  This is a code bundle for Craft E-commerce Frontend. The original project is available at https://www.figma.com/design/KTRAg8JzQSk4SHxwBygIh8/Craft-E-commerce-Frontend.

  ## Running the code

  Run `npm i` to install the dependencies.

  Run `npm run dev` to start the development server.

## Database Management (Supabase CLI)

This project uses Supabase CLI for version-controlled database migrations.

### Prerequisites
- Supabase CLI installed: `npm install supabase --save-dev`
- Docker (required for local development if using `supabase start`)

### Setup
1. Link your project (required once):
   ```bash
   npx supabase link --project-ref $SUPABASE_PROJECT_REF
   ```

### Workflow
1. **Make Changes**: Create a new migration file:
   ```bash
   npx supabase migration new your_change_name
   ```
2. **Edit SQL**: Add your SQL commands to the generated file in `supabase/migrations/`.
3. **Deploy**: Push changes to the remote database:
   ```bash
   npx supabase db push
   ```
4. **Commit**: Always commit migration files to Git.

### Environment Variables
Ensure your `.env` files contain:
- `SUPABASE_PROJECT_REF`
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (backend only)

  