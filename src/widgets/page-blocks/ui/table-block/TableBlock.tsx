import type { PageTableBlock } from '@/entities/page';
import { SectionHeading } from '@/shared/ui/section-heading';
import styles from './TableBlock.module.scss';

type TableBlockProps = {
	block: PageTableBlock;
};

export function TableBlock({ block }: TableBlockProps) {
	if (block.columns.length === 0 || block.rows.length === 0) {
		return null;
	}

	return (
		<section className={styles.section}>
			<div className={styles.inner}>
				<SectionHeading title={block.title} description={block.description} />

				<div className={styles.tableWrap}>
					<table className={styles.table}>
						<thead>
							<tr>
								{block.columns.map((column) => (
									<th
										className={
											column.isSelected ? styles.cellSelected : undefined
										}
										key={column.id}
										scope='col'
									>
										{column.title}
									</th>
								))}
							</tr>
						</thead>
						<tbody>
							{block.rows.map((row) => (
								<tr key={row.id}>
									{row.cells.map((cell, index) => {
										const column = block.columns[index];

										return (
											<td
												className={
													column?.isSelected ? styles.cellSelected : undefined
												}
												key={`${row.id}-${column?.id || index}`}
											>
												{cell}
											</td>
										);
									})}
								</tr>
							))}
						</tbody>
					</table>
				</div>
			</div>
		</section>
	);
}
