package jp.tubeboard.features.lives.pdf.canvas;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

import jp.tubeboard.features.lives.dto.response.LiveResponse;
import jp.tubeboard.features.lives.dto.response.PublicSettingSheetSubmissionDetailResponse;
import jp.tubeboard.features.lives.dto.response.PublicSettingSheetSubmissionDetailResponse.FieldAnswerResponse;
import jp.tubeboard.features.lives.dto.response.PublicSettingSheetSubmissionDetailResponse.GroupItemResponse;
import jp.tubeboard.features.lives.dto.response.SettingSheetConfigResponse;
import jp.tubeboard.features.lives.dto.response.SettingSheetConfigResponse.FormBlockResponse;
import jp.tubeboard.features.lives.dto.response.SettingSheetConfigResponse.VariantResponse;

/**
 * Builds the JEXL evaluation namespace exposed to expressions inside text
 * elements. The shape is deliberately minimal so that any user-defined form can
 * be referenced uniformly via {@code fields[id]} and {@code groups[id].items}.
 */
public final class CanvasContext {

    public static final class FieldRef {
        private final String value;
        private final List<String> values;
        private final boolean empty;

        public FieldRef(String value, List<String> values, boolean empty) {
            this.value = value;
            this.values = values;
            this.empty = empty;
        }

        public String getValue() { return value; }
        public List<String> getValues() { return values; }
        public boolean isEmpty() { return empty; }

        public static FieldRef from(FieldAnswerResponse answer, String blockType) {
            if (answer == null || answer.values() == null || answer.values().isEmpty()) {
                return new FieldRef("", List.of(), true);
            }
            String joined = formatValues(answer.values(), blockType);
            return new FieldRef(joined, List.copyOf(answer.values()), false);
        }

        private static String formatValues(List<String> values, String blockType) {
            if ("BOOLEAN".equals(blockType) && values.size() == 1) {
                String v = values.get(0);
                if ("true".equalsIgnoreCase(v)) return "true";
                if ("false".equalsIgnoreCase(v)) return "false";
            }
            return String.join(" / ", values);
        }
    }

    public static final class GroupRef {
        private final List<ItemRef> items;
        private final int count;

        public GroupRef(List<ItemRef> items, int count) {
            this.items = items;
            this.count = count;
        }

        public List<ItemRef> getItems() { return items; }
        public int getCount() { return count; }
    }

    public static final class ItemRef {
        private final int index;
        private final String variant;
        private final Map<String, FieldRef> fields;
        private final Map<String, GroupRef> groups;

        public ItemRef(int index, String variant, Map<String, FieldRef> fields,
                Map<String, GroupRef> groups) {
            this.index = index;
            this.variant = variant;
            this.fields = fields;
            this.groups = groups;
        }

        public int getIndex() { return index; }
        public String getVariant() { return variant; }
        public Map<String, FieldRef> getFields() { return fields; }
        public Map<String, GroupRef> getGroups() { return groups; }

        public FieldRef field(String id) {
            return fields.getOrDefault(id, new FieldRef("", List.of(), true));
        }

        public GroupRef group(String id) {
            return groups.getOrDefault(id, new GroupRef(List.of(), 0));
        }
    }

    public static final class LiveRef {
        private final String name;
        private final LocalDate date;
        private final String location;
        private final String tenantName;
        private final LocalDateTime deadlineAt;
        private final String status;

        public LiveRef(String name, LocalDate date, String location, String tenantName,
                LocalDateTime deadlineAt, String status) {
            this.name = name;
            this.date = date;
            this.location = location;
            this.tenantName = tenantName;
            this.deadlineAt = deadlineAt;
            this.status = status;
        }

        public String getName() { return name; }
        public LocalDate getDate() { return date; }
        public String getLocation() { return location; }
        public String getTenantName() { return tenantName; }
        public LocalDateTime getDeadlineAt() { return deadlineAt; }
        public String getStatus() { return status; }
    }

    public static final class SubmissionRef {
        private final LocalDateTime submittedAt;

        public SubmissionRef(LocalDateTime submittedAt) {
            this.submittedAt = submittedAt;
        }

        public LocalDateTime getSubmittedAt() { return submittedAt; }
    }

    private CanvasContext() {
    }

    /** Build a fresh evaluation namespace. Mutable map so callers can inject loop vars. */
    public static Map<String, Object> build(LiveResponse live, SettingSheetConfigResponse config,
            PublicSettingSheetSubmissionDetailResponse submission) {
        Map<String, FieldRef> fieldRefs = new HashMap<>();
        Map<String, GroupRef> groupRefs = new HashMap<>();

        Map<String, FieldAnswerResponse> answers = indexAnswers(submission.answers());
        Map<String, FormBlockResponse> blocksById = new HashMap<>();
        indexBlocks(config.blocks(), blocksById);

        for (FormBlockResponse block : blocksById.values()) {
            if ("REPEATABLE_GROUP".equals(block.type())) {
                FieldAnswerResponse answer = answers.get(block.id());
                List<GroupItemResponse> items = answer != null && answer.items() != null
                        ? answer.items()
                        : List.of();
                List<ItemRef> itemRefs = new ArrayList<>(items.size());
                for (int i = 0; i < items.size(); i++) {
                    itemRefs.add(buildItemRef(block, items.get(i), i));
                }
                groupRefs.put(block.id(), new GroupRef(itemRefs, itemRefs.size()));
            } else if (!"SECTION".equals(block.type())) {
                fieldRefs.put(block.id(), FieldRef.from(answers.get(block.id()), block.type()));
            }
        }

        Map<String, Object> root = new HashMap<>();
        root.put("live", new LiveRef(
                live.name(), live.date(), live.location(), live.tenantName(),
                live.deadlineAt(), live.status() != null ? live.status().name() : null));
        root.put("submission", new SubmissionRef(submission.submittedAt()));
        root.put("fields", fieldRefs);
        root.put("groups", groupRefs);
        return root;
    }

    private static ItemRef buildItemRef(FormBlockResponse groupBlock, GroupItemResponse item, int index) {
        Map<String, FieldRef> itemFields = new HashMap<>();
        Map<String, GroupRef> itemGroups = new HashMap<>();
        Map<String, FieldAnswerResponse> answers = indexAnswers(item.answers());
        List<FormBlockResponse> blocks = flattenItemBlocks(groupBlock, item.variantId());
        for (FormBlockResponse field : blocks) {
            if ("SECTION".equals(field.type())) continue;
            if ("REPEATABLE_GROUP".equals(field.type())) {
                FieldAnswerResponse answer = answers.get(field.id());
                List<GroupItemResponse> nested = answer != null && answer.items() != null
                        ? answer.items() : List.of();
                List<ItemRef> nestedRefs = new ArrayList<>(nested.size());
                for (int i = 0; i < nested.size(); i++) {
                    nestedRefs.add(buildItemRef(field, nested.get(i), i));
                }
                itemGroups.put(field.id(), new GroupRef(nestedRefs, nestedRefs.size()));
                continue;
            }
            itemFields.put(field.id(), FieldRef.from(answers.get(field.id()), field.type()));
        }
        return new ItemRef(index, item.variantId(), itemFields, itemGroups);
    }

    /** Returns all blocks reachable from the chosen variant (or root fields),
     *  recursively descending through SECTION nodes so nested groups are
     *  visible at the same level. */
    private static List<FormBlockResponse> flattenItemBlocks(FormBlockResponse block, String variantId) {
        List<FormBlockResponse> raw = resolveItemFields(block, variantId);
        List<FormBlockResponse> out = new ArrayList<>();
        flattenSections(raw, out);
        return out;
    }

    private static void flattenSections(List<FormBlockResponse> blocks, List<FormBlockResponse> out) {
        if (blocks == null) return;
        for (FormBlockResponse b : blocks) {
            if ("SECTION".equals(b.type())) {
                flattenSections(b.fields(), out);
            } else {
                out.add(b);
            }
        }
    }

    private static List<FormBlockResponse> resolveItemFields(FormBlockResponse block, String variantId) {
        List<VariantResponse> variants = block.variants();
        if (variants == null || variants.isEmpty()) {
            return block.fields() != null ? block.fields() : List.of();
        }
        if (variantId != null) {
            for (VariantResponse v : variants) {
                if (variantId.equals(v.id())) return v.fields();
            }
        }
        return variants.get(0).fields();
    }

    private static Map<String, FieldAnswerResponse> indexAnswers(List<FieldAnswerResponse> answers) {
        Map<String, FieldAnswerResponse> out = new HashMap<>();
        if (answers == null) return out;
        for (FieldAnswerResponse a : answers) out.put(a.fieldId(), a);
        return out;
    }

    private static void indexBlocks(List<FormBlockResponse> blocks, Map<String, FormBlockResponse> out) {
        if (blocks == null) return;
        for (FormBlockResponse b : blocks) {
            out.put(b.id(), b);
            indexBlocks(b.fields(), out);
            if (b.variants() != null) {
                for (VariantResponse v : b.variants()) {
                    indexBlocks(v.fields(), out);
                }
            }
        }
    }

    /** Helper functions exposed in the default JEXL namespace. */
    public static final class Helpers {
        private static final DateTimeFormatter DEFAULT_DATE = DateTimeFormatter.ofPattern("yyyy/M/d", Locale.JAPAN);

        public Object boolMark(Object value) {
            if (value == null) return "×";
            String s = value.toString();
            if ("true".equalsIgnoreCase(s) || "1".equals(s) || "yes".equalsIgnoreCase(s)) return "○";
            return "×";
        }

        public String join(Object values, String sep) {
            if (values == null) return "";
            String separator = sep == null ? "" : sep;
            if (values instanceof GroupRef g) return joinItems(g.getItems(), separator, null);
            if (values instanceof List<?> list) {
                StringBuilder sb = new StringBuilder();
                for (int i = 0; i < list.size(); i++) {
                    if (i > 0) sb.append(separator);
                    sb.append(list.get(i));
                }
                return sb.toString();
            }
            return values.toString();
        }

        /** Join one field across all items of a repeatable group:
         *  {@code joinField(groups['members'], 'member-name', ' / ')}. */
        public String joinField(Object groupOrItems, String fieldId, String sep) {
            String separator = sep == null ? "" : sep;
            List<ItemRef> items = asItems(groupOrItems);
            return joinItems(items, separator, fieldId);
        }

        /** Pluck the values of a single field across a group, returning a list
         *  (so further filters/joins can be chained). */
        public List<String> pluck(Object groupOrItems, String fieldId) {
            List<ItemRef> items = asItems(groupOrItems);
            List<String> out = new ArrayList<>(items.size());
            for (ItemRef item : items) out.add(item.field(fieldId).getValue());
            return out;
        }

        /** Filter a group's items by a predicate field equal to a value. */
        public List<ItemRef> filterEquals(Object groupOrItems, String fieldId, Object expected) {
            List<ItemRef> items = asItems(groupOrItems);
            String target = expected == null ? "" : expected.toString();
            List<ItemRef> out = new ArrayList<>();
            for (ItemRef item : items) {
                if (target.equals(item.field(fieldId).getValue())) out.add(item);
            }
            return out;
        }

        public String truncate(Object value, int max) {
            if (value == null) return "";
            String s = value.toString();
            if (s.length() <= max) return s;
            return s.substring(0, Math.max(0, max - 1)) + "…";
        }

        public String formatDate(Object value, String pattern) {
            if (value == null) return "";
            DateTimeFormatter fmt = pattern == null || pattern.isBlank() ? DEFAULT_DATE
                    : DateTimeFormatter.ofPattern(pattern, Locale.JAPAN);
            if (value instanceof LocalDate d) return fmt.format(d);
            if (value instanceof LocalDateTime dt) return fmt.format(dt);
            return value.toString();
        }

        public Object defaultTo(Object value, Object fallback) {
            if (value == null) return fallback;
            String s = value.toString();
            return s.isBlank() ? fallback : value;
        }

        public int count(Object value) {
            if (value == null) return 0;
            if (value instanceof List<?> list) return list.size();
            if (value instanceof GroupRef g) return g.getCount();
            return 0;
        }

        public boolean contains(Object collection, Object needle) {
            if (collection instanceof List<?> list) return list.contains(needle == null ? null : needle.toString());
            if (collection == null) return false;
            return collection.toString().contains(needle == null ? "" : needle.toString());
        }

        @SuppressWarnings("unchecked")
        private static List<ItemRef> asItems(Object value) {
            if (value == null) return List.of();
            if (value instanceof GroupRef g) return g.getItems();
            if (value instanceof List<?> list) {
                if (list.isEmpty()) return List.of();
                if (list.get(0) instanceof ItemRef) return (List<ItemRef>) value;
            }
            return List.of();
        }

        private static String joinItems(List<ItemRef> items, String sep, String fieldId) {
            StringBuilder sb = new StringBuilder();
            for (int i = 0; i < items.size(); i++) {
                if (i > 0) sb.append(sep);
                ItemRef item = items.get(i);
                if (fieldId == null) sb.append(item.toString());
                else sb.append(item.field(fieldId).getValue());
            }
            return sb.toString();
        }
    }
}
