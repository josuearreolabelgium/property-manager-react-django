from django.db import migrations, models

MAX_LENGTH = 120


def rename_duplicate_names(apps, schema_editor):
    """Before the name becomes unique, rename repeated names so the constraint can be added.

    The oldest property keeps its name; the others become "Name (2)", "Name (3)", ...
    (The old API allowed creating several properties with the same name.)
    """
    Property = apps.get_model("properties", "Property")
    taken = set(Property.objects.values_list("name", flat=True))
    seen = set()
    for prop in Property.objects.order_by("id"):
        if prop.name not in seen:
            seen.add(prop.name)
            continue
        n = 2
        while True:
            suffix = f" ({n})"
            candidate = prop.name[:MAX_LENGTH - len(suffix)] + suffix
            if candidate not in taken:
                break
            n += 1
        taken.add(candidate)
        prop.name = candidate
        prop.save(update_fields=["name"])


class Migration(migrations.Migration):

    dependencies = [
        ('properties', '0002_property_address_property_operation_and_more'),
    ]

    operations = [
        # Going back needs no data change: the renamed rows simply keep their new names
        migrations.RunPython(rename_duplicate_names, migrations.RunPython.noop),
        migrations.AlterField(
            model_name='property',
            name='name',
            field=models.CharField(max_length=MAX_LENGTH, unique=True),
        ),
    ]
