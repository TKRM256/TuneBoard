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

        public ItemRef(int index, String variant, Map<String, FieldRef> fields) {
            this.index = index;
            this.variant = variant;
            this.fields = fields;
        }

        public int getIndex() { return index; }
        public String getVariant() { return variant; }
        public Map<String, FieldRef> getFields() { return fields; }

        public FieldRef field(String id) {
            return fields.getOrDefault(id, new FieldRef("", List.of(), true));
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
        Map<String, FieldAnswerResponse> answers = indexAnswers(item.answers());
        List<FormBlockResponse> blocks = resolveItemFields(groupBlock, item.variantId());
        for (FormBlockResponse field : blocks) {
            if ("SECTION".equals(field.type()) || "REPEATABLE_GROUP".equals(field.type())) {
                continue;
            }
            itemFields.put(field.id(), FieldRef.from(answers.get(field.id()), field.type()));
        }
        return new ItemRef(index, item.variantId(), itemFields);
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
            if (values instanceof List<?> list) {
                StringBuilder sb = new StringBuilder();
                for (int i = 0; i < list.size(); i++) {
                    if (i > 0) sb.append(sep);
                    sb.append(list.get(i));
                }
                return sb.toString();
            }
            return values.toString();
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
    }
}
