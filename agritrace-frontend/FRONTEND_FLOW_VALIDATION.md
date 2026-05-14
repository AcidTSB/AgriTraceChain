# Frontend Flow Validation

## Journey 1: Consumer
1. Open Landing page `/`.
2. Click `Scan QR` -> `/scan-qr`.
3. Scan QR or enter code -> `/trace/:batchCode`.
4. Verify trust block at top:
- `VERIFIED` only if INSPECTION exists and no compromised integrity.
- `AWAITING INSPECTION` if no inspection gate yet.
- `COMPROMISED` if any integrity record is compromised.

Expected UX:
- Top trust badge visible immediately.
- INSPECTION event highlighted as `QC Gate` in timeline.
- Public error/empty states provide next action.

## Journey 2: Farmer
1. Login as FARMER -> `/farmer/dashboard`.
2. Create Farm -> `/farmer/farms/new`.
3. Redirect to Create Batch -> `/farmer/batches/new`.
4. Create batch -> `/farmer/batches/:batchCode`.
5. Add trace log -> `/farmer/batches/:batchCode/trace/new`.
6. Share QR -> `/farmer/batches/:batchCode/qr-share`.

Expected UX:
- Dashboard shows operational summary (total batches, pending inspection).
- Internal batch detail shows actor/location/quantity and metadata.
- QR share supports copy link + download QR image.

## Journey 3: Inspector
1. Login as INSPECTOR -> `/inspector/dashboard`.
2. Open queue -> `/inspector/review`.
3. View detail -> `/inspector/batches/:batchCode`.
4. Submit INSPECTION.
5. Return queue and refresh state.

Expected UX:
- Queue buttons disabled during processing/loading.
- Optimistic queue removal with rollback on submit failure.
- After INSPECTION, public trace can move to VERIFIED state.

## Consistency Baseline
- Use shared UI primitives: `Button`, `Input`, `Card`, `Badge`, `StateCard`.
- Empty/error states should use `StateCard` with actionable CTA.
- Timeline trust storytelling must prioritize top trust badge and inspection gate visibility.
